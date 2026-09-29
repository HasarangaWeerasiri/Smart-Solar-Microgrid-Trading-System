/*
 * File: JwtSettings.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: Strongly typed holder for the JWT signing details read from configuration
 *              (the Jwt section). Injected through IOptions<JwtSettings>.
 */

namespace Microgrid.Api.Settings;

/// <summary>
/// Configuration values used to sign and validate JSON Web Tokens.
/// </summary>
public class JwtSettings
{
    /// <summary>
    /// Who issued the token. Written into the token and checked when it comes back.
    /// </summary>
    public string Issuer { get; set; } = string.Empty;

    /// <summary>
    /// Who the token is meant for. Written into the token and checked when it comes back.
    /// </summary>
    public string Audience { get; set; } = string.Empty;

    /// <summary>
    /// Secret key used to sign the token. The real value is kept in
    /// appsettings.Development.json, which is not committed.
    /// </summary>
    public string Key { get; set; } = string.Empty;

    /// <summary>
    /// How long a token stays valid, in minutes.
    /// </summary>
    public int ExpiryMinutes { get; set; } = 480;

    /// <summary>
    /// Returns true when the signing key is blank, still the placeholder from appsettings.json,
    /// or too short. HMAC-SHA256 needs at least 32 characters to be secure.
    /// </summary>
    public bool IsKeyMissing()
    {
        // Treat blank values, the "<set in ...>" placeholder and short keys as "not configured".
        return string.IsNullOrWhiteSpace(Key)
               || Key.StartsWith('<')
               || Key.Length < 32;
    }
}
