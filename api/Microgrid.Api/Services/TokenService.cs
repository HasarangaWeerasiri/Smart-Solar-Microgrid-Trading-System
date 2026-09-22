/*
 * File: TokenService.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: Builds the signed JSON Web Token returned at login. The token carries the
 *              user id and role, which is what role-based authorization checks later.
 */

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microgrid.Api.Models;
using Microgrid.Api.Services.Interfaces;
using Microgrid.Api.Settings;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Microgrid.Api.Services;

/// <summary>
/// Creates JWTs signed with the key from configuration.
/// </summary>
public class TokenService : ITokenService
{
    private readonly JwtSettings _jwtSettings;

    /// <summary>
    /// Creates the service with the JWT settings supplied by dependency injection.
    /// </summary>
    public TokenService(IOptions<JwtSettings> jwtOptions)
    {
        _jwtSettings = jwtOptions.Value;
    }

    /// <summary>
    /// Builds a signed JWT holding the user's id, role and name, and returns it together
    /// with its expiry time so the client knows when to log in again.
    /// </summary>
    public (string Token, DateTime ExpiresAtUtc) CreateToken(User user)
    {
        // Claims are the facts about the user that travel inside the token.
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Role, user.Role),
            new("fullName", user.FullName)
        };

        // Staff have an email; a prosumer may not, so only add it when it exists.
        if (!string.IsNullOrWhiteSpace(user.Email))
        {
            claims.Add(new Claim(ClaimTypes.Email, user.Email));
        }

        // Sign with HMAC-SHA256 using the secret key, so the server can detect any tampering.
        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSettings.Key));
        var credentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);
        var expiresAtUtc = DateTime.UtcNow.AddMinutes(_jwtSettings.ExpiryMinutes);

        var token = new JwtSecurityToken(
            issuer: _jwtSettings.Issuer,
            audience: _jwtSettings.Audience,
            claims: claims,
            expires: expiresAtUtc,
            signingCredentials: credentials);

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAtUtc);
    }
}
