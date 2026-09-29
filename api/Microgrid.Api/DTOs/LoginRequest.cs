/*
 * File: LoginRequest.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: What the web and mobile clients send to POST /api/auth/login.
 */

using System.ComponentModel.DataAnnotations;

namespace Microgrid.Api.DTOs;

/// <summary>
/// Login details sent by a client.
/// </summary>
public class LoginRequest
{
    /// <summary>
    /// Email address for staff, or NIC for a prosumer. One field serves both so that the
    /// web app and the mobile app can use the same endpoint.
    /// </summary>
    [Required(ErrorMessage = "Email or NIC is required.")]
    public string Identifier { get; set; } = string.Empty;

    /// <summary>The plain password, checked against the stored BCrypt hash.</summary>
    [Required(ErrorMessage = "Password is required.")]
    public string Password { get; set; } = string.Empty;
}
