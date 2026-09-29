/*
 * File: CreateStaffRequest.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: What the web app sends to POST /api/users when a Backoffice officer creates
 *              a new Backoffice or Grid Operator account. The attributes only check the
 *              shape of the input; the account rules are enforced in StaffService.
 */

using System.ComponentModel.DataAnnotations;

namespace Microgrid.Api.DTOs;

/// <summary>
/// Details for a new staff account.
/// </summary>
public class CreateStaffRequest
{
    /// <summary>Full name of the staff member.</summary>
    [Required(ErrorMessage = "Full name is required.")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Full name must be 2 to 100 characters.")]
    public string FullName { get; set; } = string.Empty;

    /// <summary>Email address. Staff log in with this, so it must be unique.</summary>
    [Required(ErrorMessage = "Email is required.")]
    [EmailAddress(ErrorMessage = "Email address is not valid.")]
    public string Email { get; set; } = string.Empty;

    /// <summary>Initial password. Stored only as a BCrypt hash.</summary>
    [Required(ErrorMessage = "Password is required.")]
    public string Password { get; set; } = string.Empty;

    /// <summary>Backoffice or GridOperator.</summary>
    [Required(ErrorMessage = "Role is required.")]
    public string Role { get; set; } = string.Empty;

    /// <summary>Contact phone number. Optional.</summary>
    [StringLength(20, ErrorMessage = "Phone number is too long.")]
    public string? Phone { get; set; }
}
