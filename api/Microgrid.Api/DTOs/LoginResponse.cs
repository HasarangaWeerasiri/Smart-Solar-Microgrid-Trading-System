/*
 * File: LoginResponse.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: What POST /api/auth/login returns on success. The clients store the token
 *              and use the role to decide which home screen to show.
 */

namespace Microgrid.Api.DTOs;

/// <summary>
/// Successful login result sent back to a client.
/// </summary>
public class LoginResponse
{
    /// <summary>The JWT to send on later requests as "Authorization: Bearer &lt;token&gt;".</summary>
    public string Token { get; set; } = string.Empty;

    /// <summary>When the token stops working, in UTC.</summary>
    public DateTime ExpiresAtUtc { get; set; }

    /// <summary>The user's id. For a prosumer this is the NIC.</summary>
    public string UserId { get; set; } = string.Empty;

    /// <summary>Full name, shown in the client's header bar.</summary>
    public string FullName { get; set; } = string.Empty;

    /// <summary>Email address, or null for a prosumer who did not give one.</summary>
    public string? Email { get; set; }

    /// <summary>Backoffice, GridOperator or Prosumer. Drives the role-based home screen.</summary>
    public string Role { get; set; } = string.Empty;

    /// <summary>Account status at the time of login. Always Active for a successful login.</summary>
    public string Status { get; set; } = string.Empty;
}
