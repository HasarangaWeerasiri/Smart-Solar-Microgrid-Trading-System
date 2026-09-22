/*
 * File: UpdateProsumerRequest.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: What a prosumer (or a Backoffice officer) sends to PUT /api/prosumers/{nic}
 *              to change a profile. There is deliberately no NIC field: the NIC is the
 *              account's primary key and can never be changed.
 */

using System.ComponentModel.DataAnnotations;

namespace Microgrid.Api.DTOs;

/// <summary>
/// New profile details for an existing prosumer.
/// </summary>
public class UpdateProsumerRequest
{
    /// <summary>Full name of the prosumer.</summary>
    [Required(ErrorMessage = "Full name is required.")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Full name must be 2 to 100 characters.")]
    public string FullName { get; set; } = string.Empty;

    /// <summary>Email address. Optional, but must be unique when given.</summary>
    [EmailAddress(ErrorMessage = "Email address is not valid.")]
    public string? Email { get; set; }

    /// <summary>Contact phone number. Optional.</summary>
    [StringLength(20, ErrorMessage = "Phone number is too long.")]
    public string? Phone { get; set; }

    /// <summary>Address of the property with the solar panels. Optional.</summary>
    [StringLength(200, ErrorMessage = "Address is too long.")]
    public string? Address { get; set; }

    /// <summary>A new password, or empty to keep the current one.</summary>
    public string? NewPassword { get; set; }
}
