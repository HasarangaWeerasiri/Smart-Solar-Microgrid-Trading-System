/*
 * File: IUserService.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: Contract for the service that holds the account business rules. All login
 *              and account decisions live behind this interface, never in a controller
 *              and never in a client.
 */

using Microgrid.Api.DTOs;
using Microgrid.Api.Models;

namespace Microgrid.Api.Services.Interfaces;

/// <summary>
/// Account rules: checking credentials and deciding who is allowed to log in.
/// </summary>
public interface IUserService
{
    /// <summary>
    /// Checks the login details and returns a token when the account is allowed in.
    /// Blocks accounts that are Pending or Deactivated.
    /// </summary>
    Task<AuthResult> LoginAsync(LoginRequest request);

    /// <summary>
    /// Finds a single user by id. For a prosumer the id is the NIC.
    /// Returns null when no such user exists.
    /// </summary>
    Task<User?> GetByIdAsync(string id);
}
