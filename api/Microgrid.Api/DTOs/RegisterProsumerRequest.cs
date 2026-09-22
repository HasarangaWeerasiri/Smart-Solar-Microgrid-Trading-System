/*
 * File: RegisterProsumerRequest.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: What the Android app sends to POST /api/prosumers when a solar prosumer
 *              registers, and what the web app sends when a Backoffice officer adds one.
 *              The NIC becomes the account's primary key, so it cannot be changed later.
 */

using System.ComponentModel.DataAnnotations;

namespace Microgrid.Api.DTOs;

/// <summary>
/// Details for a new prosumer account.
/// </summary>
public class RegisterProsumerRequest
{
    /// <summary>National Identity Card number. Becomes the account id and must be unique.</summary>
    [Required(ErrorMessage = "NIC is required.")]
    public string Nic { get; set; } = string.Empty;

    /// <summary>Full name of the prosumer.</summary>
    [Required(ErrorMessage = "Full name is required.")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Full name must be 2 to 100 characters.")]
    public string FullName { get; set; } = string.Empty;

    /// <summary>Password for logging in with the NIC. Stored only as a BCrypt hash.</summary>
    [Required(ErrorMessage = "Password is required.")]
    public string Password { get; set; } = string.Empty;

    /// <summary>Email address. Optional, but must be unique when given.</summary>
    [EmailAddress(ErrorMessage = "Email address is not valid.")]
    public string? Email { get; set; }

    /// <summary>Contact phone number. Optional.</summary>
    [StringLength(20, ErrorMessage = "Phone number is too long.")]
    public string? Phone { get; set; }

    /// <summary>Address of the property with the solar panels. Optional.</summary>
    [StringLength(200, ErrorMessage = "Address is too long.")]
    public string? Address { get; set; }
}
