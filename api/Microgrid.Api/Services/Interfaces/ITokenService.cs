/*
 * File: ITokenService.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: Contract for the service that creates JSON Web Tokens for logged-in users.
 */

using Microgrid.Api.Models;

namespace Microgrid.Api.Services.Interfaces;

/// <summary>
/// Creates the JWT that a client sends on every later request.
/// </summary>
public interface ITokenService
{
    /// <summary>
    /// Builds a signed JWT for the given user and reports when it expires.
    /// </summary>
    (string Token, DateTime ExpiresAtUtc) CreateToken(User user);
}
