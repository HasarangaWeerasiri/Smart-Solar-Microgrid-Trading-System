/*
 * File: UpdateStaffRequest.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: What the web app sends to PUT /api/users/{id} to change a staff account.
 *              The password is optional: leave it empty to keep the current one.
 */

using System.ComponentModel.DataAnnotations;

namespace Microgrid.Api.DTOs;

/// <summary>
/// New details for an existing staff account.
/// </summary>
public class UpdateStaffRequest
{
    /// <summary>Full name of the staff member.</summary>
    [Required(ErrorMessage = "Full name is required.")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Full name must be 2 to 100 characters.")]
    public string FullName { get; set; } = string.Empty;

    /// <summary>Email address. Must stay unique across all accounts.</summary>
    [Required(ErrorMessage = "Email is required.")]
    [EmailAddress(ErrorMessage = "Email address is not valid.")]
    public string Email { get; set; } = string.Empty;

    /// <summary>Backoffice or GridOperator.</summary>
    [Required(ErrorMessage = "Role is required.")]
    public string Role { get; set; } = string.Empty;

    /// <summary>Contact phone number. Optional.</summary>
    [StringLength(20, ErrorMessage = "Phone number is too long.")]
    public string? Phone { get; set; }

    /// <summary>A new password, or empty to keep the current one.</summary>
    public string? NewPassword { get; set; }
}
