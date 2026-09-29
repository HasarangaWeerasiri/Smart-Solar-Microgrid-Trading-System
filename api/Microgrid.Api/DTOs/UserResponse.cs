/*
 * File: UserResponse.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: The account details sent back to the web and mobile clients, for both staff
 *              and prosumers. It deliberately has no password field, so the password hash
 *              stored in MongoDB can never leak out through the API.
 */

using Microgrid.Api.Models;

namespace Microgrid.Api.DTOs;

/// <summary>
/// Safe, client-facing view of one account.
/// </summary>
public class UserResponse
{
    /// <summary>The account id. For a prosumer this is the NIC.</summary>
    public string UserId { get; set; } = string.Empty;

    /// <summary>The NIC for a prosumer, or null for staff.</summary>
    public string? Nic { get; set; }

    /// <summary>Full name of the person.</summary>
    public string FullName { get; set; } = string.Empty;

    /// <summary>Email address, or null if none was given.</summary>
    public string? Email { get; set; }

    /// <summary>Backoffice, GridOperator or Prosumer.</summary>
    public string Role { get; set; } = string.Empty;

    /// <summary>Pending, Active or Deactivated.</summary>
    public string Status { get; set; } = string.Empty;

    /// <summary>Contact phone number, if given.</summary>
    public string? Phone { get; set; }

    /// <summary>Postal address, if given.</summary>
    public string? Address { get; set; }

    /// <summary>When the account was created, in UTC.</summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Copies the safe fields from a stored user. The password hash is not copied.
    /// </summary>
    public static UserResponse FromUser(User user)
    {
        return new UserResponse
        {
            UserId = user.Id,
            Nic = user.Nic,
            FullName = user.FullName,
            Email = user.Email,
            Role = user.Role,
            Status = user.Status,
            Phone = user.Phone,
            Address = user.Address,
            CreatedAt = user.CreatedAt
        };
    }
}
