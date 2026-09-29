/*
 * File: StaffService.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: Business rules for staff accounts (Backoffice and Grid Operator). Creates,
 *              updates, deactivates and reactivates staff in the Users collection. Every
 *              rule is enforced here: valid roles, unique email, password policy, and the
 *              guards that stop a Backoffice officer from locking themselves out.
 */

using Microgrid.Api.DTOs;
using Microgrid.Api.Models;
using Microgrid.Api.Services.Interfaces;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Microgrid.Api.Services;

/// <summary>
/// Manages staff accounts stored in the Users collection.
/// </summary>
public class StaffService : IStaffService
{
    // The only roles a staff account may have. Prosumers are handled by ProsumerService.
    private static readonly string[] StaffRoles = [Roles.Backoffice, Roles.GridOperator];

    private static readonly string[] AllStatuses =
        [AccountStatus.Pending, AccountStatus.Active, AccountStatus.Deactivated];

    private readonly IMongoCollection<User> _users;

    /// <summary>
    /// Creates the service with the MongoDB database supplied by dependency injection.
    /// </summary>
    public StaffService(IMongoDatabase database)
    {
        _users = database.GetCollection<User>("Users");
    }

    /// <summary>
    /// Lists staff accounts, newest first, optionally filtered by role and status.
    /// Unknown filter values are rejected so a typo does not silently return nothing.
    /// </summary>
    public async Task<ServiceResult<List<UserResponse>>> GetAllAsync(string? role, string? status)
    {
        var filter = Builders<User>.Filter.In(u => u.Role, StaffRoles);

        if (!string.IsNullOrWhiteSpace(role))
        {
            if (!StaffRoles.Contains(role))
            {
                return ServiceResult<List<UserResponse>>.Fail(
                    $"Role filter must be one of: {string.Join(", ", StaffRoles)}.", 400);
            }
            filter &= Builders<User>.Filter.Eq(u => u.Role, role);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!AllStatuses.Contains(status))
            {
                return ServiceResult<List<UserResponse>>.Fail(
                    $"Status filter must be one of: {string.Join(", ", AllStatuses)}.", 400);
            }
            filter &= Builders<User>.Filter.Eq(u => u.Status, status);
        }

        var staff = await _users.Find(filter).SortByDescending(u => u.CreatedAt).ToListAsync();
        return ServiceResult<List<UserResponse>>.Ok(staff.Select(UserResponse.FromUser).ToList());
    }

    /// <summary>
    /// Returns one staff account. A prosumer's id gives 404 here, so staff pages can never
    /// be used to read or change prosumer accounts.
    /// </summary>
    public async Task<ServiceResult<UserResponse>> GetByIdAsync(string id)
    {
        var user = await FindStaffAsync(id);
        if (user is null)
        {
            return ServiceResult<UserResponse>.Fail("No staff account was found with that id.", 404);
        }

        return ServiceResult<UserResponse>.Ok(UserResponse.FromUser(user));
    }

    /// <summary>
    /// Creates a new staff account. It starts Active, because a Backoffice officer created it.
    /// Returns 400 for a bad role or weak password, and 409 when the email is already used.
    /// </summary>
    public async Task<ServiceResult<UserResponse>> CreateAsync(CreateStaffRequest request)
    {
        if (!StaffRoles.Contains(request.Role))
        {
            return ServiceResult<UserResponse>.Fail(
                $"Role must be one of: {string.Join(", ", StaffRoles)}.", 400);
        }

        var passwordError = PasswordPolicy.Validate(request.Password);
        if (passwordError is not null)
        {
            return ServiceResult<UserResponse>.Fail(passwordError, 400);
        }

        // Emails are stored lower case so "Kamal@X.lk" and "kamal@x.lk" count as the same.
        var email = request.Email.Trim().ToLowerInvariant();
        if (await EmailInUseAsync(email, excludeUserId: null))
        {
            return ServiceResult<UserResponse>.Fail("That email address is already used by another account.", 409);
        }

        var user = new User
        {
            Id = ObjectId.GenerateNewId().ToString(),
            FullName = request.FullName.Trim(),
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = request.Role,
            Status = AccountStatus.Active,
            Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        try
        {
            await _users.InsertOneAsync(user);
        }
        catch (MongoWriteException exception) when (exception.WriteError?.Category == ServerErrorCategory.DuplicateKey)
        {
            // Two requests racing with the same email: the unique index stops the second one.
            return ServiceResult<UserResponse>.Fail("That email address is already used by another account.", 409);
        }

        return ServiceResult<UserResponse>.Ok(UserResponse.FromUser(user), 201);
    }

    /// <summary>
    /// Updates a staff account's name, email, role, phone and, optionally, password.
    /// A Backoffice officer cannot change their own role, so they cannot remove their
    /// own admin access by mistake.
    /// </summary>
    public async Task<ServiceResult<UserResponse>> UpdateAsync(string id, UpdateStaffRequest request, string currentUserId)
    {
        var user = await FindStaffAsync(id);
        if (user is null)
        {
            return ServiceResult<UserResponse>.Fail("No staff account was found with that id.", 404);
        }

        if (!StaffRoles.Contains(request.Role))
        {
            return ServiceResult<UserResponse>.Fail(
                $"Role must be one of: {string.Join(", ", StaffRoles)}.", 400);
        }

        if (user.Id == currentUserId && user.Role != request.Role)
        {
            return ServiceResult<UserResponse>.Fail("You cannot change your own role.", 400);
        }

        var email = request.Email.Trim().ToLowerInvariant();
        if (await EmailInUseAsync(email, excludeUserId: user.Id))
        {
            return ServiceResult<UserResponse>.Fail("That email address is already used by another account.", 409);
        }

        var update = Builders<User>.Update
            .Set(u => u.FullName, request.FullName.Trim())
            .Set(u => u.Email, email)
            .Set(u => u.Role, request.Role)
            .Set(u => u.Phone, string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim());

        // An empty password field means "keep the current password".
        if (!string.IsNullOrEmpty(request.NewPassword))
        {
            var passwordError = PasswordPolicy.Validate(request.NewPassword);
            if (passwordError is not null)
            {
                return ServiceResult<UserResponse>.Fail(passwordError, 400);
            }
            update = update.Set(u => u.PasswordHash, BCrypt.Net.BCrypt.HashPassword(request.NewPassword));
        }

        try
        {
            await _users.UpdateOneAsync(u => u.Id == user.Id, update);
        }
        catch (MongoWriteException exception) when (exception.WriteError?.Category == ServerErrorCategory.DuplicateKey)
        {
            return ServiceResult<UserResponse>.Fail("That email address is already used by another account.", 409);
        }

        return await GetByIdAsync(user.Id);
    }

    /// <summary>
    /// Deactivates a staff account so it can no longer log in. Blocks a Backoffice officer
    /// from deactivating themselves, which could leave nobody able to manage the system.
    /// </summary>
    public async Task<ServiceResult<UserResponse>> DeactivateAsync(string id, string currentUserId)
    {
        if (id == currentUserId)
        {
            return ServiceResult<UserResponse>.Fail("You cannot deactivate your own account.", 400);
        }

        return await ChangeStatusAsync(id, AccountStatus.Deactivated, "This account is already deactivated.");
    }

    /// <summary>
    /// Reactivates a deactivated staff account so it can log in again.
    /// </summary>
    public async Task<ServiceResult<UserResponse>> ActivateAsync(string id)
    {
        return await ChangeStatusAsync(id, AccountStatus.Active, "This account is already active.");
    }

    /// <summary>
    /// Moves a staff account to a new status. Returns 404 for an unknown account and
    /// 409 when it is already in that status.
    /// </summary>
    private async Task<ServiceResult<UserResponse>> ChangeStatusAsync(string id, string newStatus, string alreadyMessage)
    {
        var user = await FindStaffAsync(id);
        if (user is null)
        {
            return ServiceResult<UserResponse>.Fail("No staff account was found with that id.", 404);
        }

        if (user.Status == newStatus)
        {
            return ServiceResult<UserResponse>.Fail(alreadyMessage, 409);
        }

        await _users.UpdateOneAsync(u => u.Id == user.Id, Builders<User>.Update.Set(u => u.Status, newStatus));
        user.Status = newStatus;
        return ServiceResult<UserResponse>.Ok(UserResponse.FromUser(user));
    }

    /// <summary>
    /// Finds a staff account by id. Returns null when the id is unknown or belongs to a
    /// prosumer, so staff operations can never touch a prosumer account.
    /// </summary>
    private async Task<User?> FindStaffAsync(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            return null;
        }

        var filter = Builders<User>.Filter.Eq(u => u.Id, id.Trim())
                     & Builders<User>.Filter.In(u => u.Role, StaffRoles);
        return await _users.Find(filter).FirstOrDefaultAsync();
    }

    /// <summary>
    /// True when another account already uses this email. The account being edited is
    /// left out, so saving a profile without changing its email is not a conflict.
    /// </summary>
    private async Task<bool> EmailInUseAsync(string email, string? excludeUserId)
    {
        var filter = Builders<User>.Filter.Eq(u => u.Email, email);
        if (excludeUserId is not null)
        {
            filter &= Builders<User>.Filter.Ne(u => u.Id, excludeUserId);
        }
        return await _users.Find(filter).AnyAsync();
    }
}
