/*
 * File: ProsumerService.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: Business rules for solar prosumer accounts. The NIC is the account's _id,
 *              so MongoDB itself guarantees a NIC can never be registered twice. This class
 *              also enforces the NIC format, the Pending-on-registration rule, and the rule
 *              that a prosumer may only see or change their own profile.
 */

using Microgrid.Api.DTOs;
using Microgrid.Api.Models;
using Microgrid.Api.Services.Interfaces;
using MongoDB.Driver;

namespace Microgrid.Api.Services;

/// <summary>
/// Manages prosumer accounts stored in the Users collection.
/// </summary>
public class ProsumerService : IProsumerService
{
    private static readonly string[] AllStatuses =
        [AccountStatus.Pending, AccountStatus.Active, AccountStatus.Deactivated];

    private readonly IMongoCollection<User> _users;

    /// <summary>
    /// Creates the service with the MongoDB database supplied by dependency injection.
    /// </summary>
    public ProsumerService(IMongoDatabase database)
    {
        _users = database.GetCollection<User>("Users");
    }

    /// <summary>
    /// Registers a prosumer with the NIC as the account id. Rejects a badly formed NIC,
    /// a NIC that is already registered, an email already in use, or a weak password.
    /// Self-registration starts Pending so a Backoffice officer must approve it.
    /// </summary>
    public async Task<ServiceResult<UserResponse>> RegisterAsync(RegisterProsumerRequest request, bool createdByBackoffice)
    {
        var nic = NicValidator.Normalise(request.Nic);

        var nicError = NicValidator.Validate(nic);
        if (nicError is not null)
        {
            return ServiceResult<UserResponse>.Fail(nicError, 400);
        }

        var passwordError = PasswordPolicy.Validate(request.Password);
        if (passwordError is not null)
        {
            return ServiceResult<UserResponse>.Fail(passwordError, 400);
        }

        // The NIC is the _id, so an existing document means this NIC is already registered.
        if (await _users.Find(u => u.Id == nic).AnyAsync())
        {
            return ServiceResult<UserResponse>.Fail("This NIC is already registered.", 409);
        }

        var email = NormaliseEmail(request.Email);
        if (email is not null && await EmailInUseAsync(email, excludeUserId: null))
        {
            return ServiceResult<UserResponse>.Fail("That email address is already used by another account.", 409);
        }

        var prosumer = new User
        {
            Id = nic,
            FullName = request.FullName.Trim(),
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = Roles.Prosumer,
            // A Backoffice officer adding a prosumer has already checked them, so that
            // account is usable straight away. Self-registration waits for approval.
            Status = createdByBackoffice ? AccountStatus.Active : AccountStatus.Pending,
            Phone = Trimmed(request.Phone),
            Address = Trimmed(request.Address),
            CreatedAt = DateTime.UtcNow
        };

        try
        {
            await _users.InsertOneAsync(prosumer);
        }
        catch (MongoWriteException exception) when (exception.WriteError?.Category == ServerErrorCategory.DuplicateKey)
        {
            // Two registrations racing with the same NIC or email: the database stops the second.
            return ServiceResult<UserResponse>.Fail("This NIC or email address is already registered.", 409);
        }

        return ServiceResult<UserResponse>.Ok(UserResponse.FromUser(prosumer), 201);
    }

    /// <summary>
    /// Lists prosumers, newest first. Passing status = Pending gives the web app's
    /// pending activations list.
    /// </summary>
    public async Task<ServiceResult<List<UserResponse>>> GetAllAsync(string? status)
    {
        var filter = Builders<User>.Filter.Eq(u => u.Role, Roles.Prosumer);

        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!AllStatuses.Contains(status))
            {
                return ServiceResult<List<UserResponse>>.Fail(
                    $"Status filter must be one of: {string.Join(", ", AllStatuses)}.", 400);
            }
            filter &= Builders<User>.Filter.Eq(u => u.Status, status);
        }

        var prosumers = await _users.Find(filter).SortByDescending(u => u.CreatedAt).ToListAsync();
        return ServiceResult<List<UserResponse>>.Ok(prosumers.Select(UserResponse.FromUser).ToList());
    }

    /// <summary>
    /// Returns one prosumer profile, if the caller is that prosumer or a Backoffice officer.
    /// </summary>
    public async Task<ServiceResult<UserResponse>> GetByNicAsync(string nic, string callerId, string callerRole)
    {
        var normalised = NicValidator.Normalise(nic);

        if (!CanManage(normalised, callerId, callerRole))
        {
            return ServiceResult<UserResponse>.Fail("You can only view your own profile.", 403);
        }

        var prosumer = await FindProsumerAsync(normalised);
        if (prosumer is null)
        {
            return ServiceResult<UserResponse>.Fail("No prosumer was found with that NIC.", 404);
        }

        return ServiceResult<UserResponse>.Ok(UserResponse.FromUser(prosumer));
    }

    /// <summary>
    /// Updates a prosumer's profile. The NIC is not part of the request, so it cannot be
    /// changed. A prosumer may only update their own profile.
    /// </summary>
    public async Task<ServiceResult<UserResponse>> UpdateAsync(string nic, UpdateProsumerRequest request, string callerId, string callerRole)
    {
        var normalised = NicValidator.Normalise(nic);

        if (!CanManage(normalised, callerId, callerRole))
        {
            return ServiceResult<UserResponse>.Fail("You can only edit your own profile.", 403);
        }

        var prosumer = await FindProsumerAsync(normalised);
        if (prosumer is null)
        {
            return ServiceResult<UserResponse>.Fail("No prosumer was found with that NIC.", 404);
        }

        var email = NormaliseEmail(request.Email);
        if (email is not null && await EmailInUseAsync(email, excludeUserId: prosumer.Id))
        {
            return ServiceResult<UserResponse>.Fail("That email address is already used by another account.", 409);
        }

        var update = Builders<User>.Update
            .Set(u => u.FullName, request.FullName.Trim())
            .Set(u => u.Email, email)
            .Set(u => u.Phone, Trimmed(request.Phone))
            .Set(u => u.Address, Trimmed(request.Address));

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
            await _users.UpdateOneAsync(u => u.Id == prosumer.Id, update);
        }
        catch (MongoWriteException exception) when (exception.WriteError?.Category == ServerErrorCategory.DuplicateKey)
        {
            return ServiceResult<UserResponse>.Fail("That email address is already used by another account.", 409);
        }

        var updated = await FindProsumerAsync(prosumer.Id);
        return ServiceResult<UserResponse>.Ok(UserResponse.FromUser(updated!));
    }

    /// <summary>
    /// Deactivates a prosumer account, either at the prosumer's own request from the mobile
    /// app or by a Backoffice officer from the web app. Only Backoffice can undo it.
    /// </summary>
    public async Task<ServiceResult<UserResponse>> DeactivateAsync(string nic, string callerId, string callerRole)
    {
        var normalised = NicValidator.Normalise(nic);

        if (!CanManage(normalised, callerId, callerRole))
        {
            return ServiceResult<UserResponse>.Fail("You can only deactivate your own account.", 403);
        }

        return await ChangeStatusAsync(normalised, AccountStatus.Deactivated, "This account is already deactivated.");
    }

    /// <summary>
    /// Approves a Pending registration, or reactivates a Deactivated account. The controller
    /// restricts this to Backoffice, which is the spec rule that only Backoffice may reactivate.
    /// </summary>
    public async Task<ServiceResult<UserResponse>> ActivateAsync(string nic)
    {
        return await ChangeStatusAsync(NicValidator.Normalise(nic), AccountStatus.Active, "This account is already active.");
    }

    /// <summary>
    /// Moves a prosumer to a new status. Returns 404 for an unknown NIC and 409 when the
    /// account is already in that status.
    /// </summary>
    private async Task<ServiceResult<UserResponse>> ChangeStatusAsync(string nic, string newStatus, string alreadyMessage)
    {
        var prosumer = await FindProsumerAsync(nic);
        if (prosumer is null)
        {
            return ServiceResult<UserResponse>.Fail("No prosumer was found with that NIC.", 404);
        }

        if (prosumer.Status == newStatus)
        {
            return ServiceResult<UserResponse>.Fail(alreadyMessage, 409);
        }

        await _users.UpdateOneAsync(u => u.Id == prosumer.Id, Builders<User>.Update.Set(u => u.Status, newStatus));
        prosumer.Status = newStatus;
        return ServiceResult<UserResponse>.Ok(UserResponse.FromUser(prosumer));
    }

    /// <summary>
    /// True when the caller is a Backoffice officer, or is the prosumer themselves.
    /// A prosumer's account id is their NIC, which is what makes this check simple.
    /// </summary>
    private static bool CanManage(string nic, string callerId, string callerRole)
    {
        return callerRole == Roles.Backoffice
               || string.Equals(callerId, nic, StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Finds a prosumer by NIC. Returns null when the id belongs to a staff account, so
    /// prosumer endpoints can never read or change staff accounts.
    /// </summary>
    private async Task<User?> FindProsumerAsync(string nic)
    {
        if (string.IsNullOrWhiteSpace(nic))
        {
            return null;
        }

        var filter = Builders<User>.Filter.Eq(u => u.Id, nic)
                     & Builders<User>.Filter.Eq(u => u.Role, Roles.Prosumer);
        return await _users.Find(filter).FirstOrDefaultAsync();
    }

    /// <summary>
    /// True when another account already uses this email.
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

    /// <summary>
    /// Lower-cases an email so the same address is always stored the same way,
    /// or returns null when no email was given.
    /// </summary>
    private static string? NormaliseEmail(string? email)
    {
        return string.IsNullOrWhiteSpace(email) ? null : email.Trim().ToLowerInvariant();
    }

    /// <summary>
    /// Trims an optional text field, turning blank input into null.
    /// </summary>
    private static string? Trimmed(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
