/*
 * File: UserService.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: Account business rules. Checks login details against the Users collection,
 *              blocks Pending and Deactivated accounts, and asks the token service for a
 *              JWT when the login is allowed. Controllers hold none of these rules.
 */

using Microgrid.Api.DTOs;
using Microgrid.Api.Models;
using Microgrid.Api.Services.Interfaces;
using MongoDB.Driver;

namespace Microgrid.Api.Services;

/// <summary>
/// Reads and checks user accounts stored in the Users collection.
/// </summary>
public class UserService : IUserService
{
    private readonly IMongoCollection<User> _users;
    private readonly ITokenService _tokenService;

    /// <summary>
    /// Creates the service with the MongoDB database and the token service supplied by
    /// dependency injection, and grabs a handle to the Users collection.
    /// </summary>
    public UserService(IMongoDatabase database, ITokenService tokenService)
    {
        _users = database.GetCollection<User>("Users");
        _tokenService = tokenService;
    }

    /// <summary>
    /// Checks the login details and returns a token when the account may log in.
    /// A wrong identifier or password gives 401. A correct password on a Pending or
    /// Deactivated account gives 403, so the client can show the real reason.
    /// </summary>
    public async Task<AuthResult> LoginAsync(LoginRequest request)
    {
        // Guard against empty input before touching the database.
        if (string.IsNullOrWhiteSpace(request.Identifier) || string.IsNullOrWhiteSpace(request.Password))
        {
            return AuthResult.Fail("Email or NIC and password are both required.");
        }

        var identifier = request.Identifier.Trim();

        // Staff log in with email, prosumers with NIC. The NIC is the _id, so one query
        // covers both by matching either field.
        var filter = Builders<User>.Filter.Or(
            Builders<User>.Filter.Eq(u => u.Id, identifier),
            Builders<User>.Filter.Eq(u => u.Email, identifier.ToLowerInvariant()));

        var user = await _users.Find(filter).FirstOrDefaultAsync();

        // Same message whether the user is missing or the password is wrong, so an attacker
        // cannot use the error to find out which accounts exist.
        if (user is null || string.IsNullOrWhiteSpace(user.PasswordHash))
        {
            return AuthResult.Fail("Invalid login details.");
        }

        if (!VerifyPassword(request.Password, user.PasswordHash))
        {
            return AuthResult.Fail("Invalid login details.");
        }

        // Business rule: a new prosumer registration waits for Backoffice approval.
        if (user.Status == AccountStatus.Pending)
        {
            return AuthResult.Fail(
                "This account is waiting for Backoffice approval. Please try again once it is activated.", 403);
        }

        // Business rule: a deactivated account cannot log in, and only Backoffice can reactivate it.
        if (user.Status == AccountStatus.Deactivated)
        {
            return AuthResult.Fail(
                "This account has been deactivated. Please contact a Backoffice officer to reactivate it.", 403);
        }

        var (token, expiresAtUtc) = _tokenService.CreateToken(user);

        return AuthResult.Ok(new LoginResponse
        {
            Token = token,
            ExpiresAtUtc = expiresAtUtc,
            UserId = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            Role = user.Role,
            Status = user.Status
        });
    }

    /// <summary>
    /// Finds one user by id. For a prosumer the id is the NIC. Returns null when not found.
    /// </summary>
    public async Task<User?> GetByIdAsync(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            return null;
        }

        return await _users.Find(u => u.Id == id.Trim()).FirstOrDefaultAsync();
    }

    /// <summary>
    /// Compares a plain password with a stored BCrypt hash. A stored hash that is damaged
    /// makes BCrypt throw, so that case is caught and treated as a failed login.
    /// </summary>
    private static bool VerifyPassword(string password, string passwordHash)
    {
        try
        {
            return BCrypt.Net.BCrypt.Verify(password, passwordHash);
        }
        catch (BCrypt.Net.SaltParseException)
        {
            return false;
        }
    }
}
