/*
 * File: VerifyQrRequest.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Member D
 * Created: 2026-09-28
 * Description: Request body for POST /api/reservations/verify-qr. Carries the token read
 *              from the prosumer's QR code by the Grid Operator's scanner.
 */

using System.ComponentModel.DataAnnotations;

namespace Microgrid.Api.DTOs;

/// <summary>
/// Request body for POST /api/reservations/verify-qr.
/// </summary>
public class VerifyQrRequest
{
    /// <summary>The token scanned from the prosumer's QR code.</summary>
    [Required(ErrorMessage = "Token is required.")]
    public string Token { get; set; } = string.Empty;
}
