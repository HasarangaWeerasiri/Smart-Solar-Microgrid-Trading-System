/*
 * File: ReservationQrResponse.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Member D
 * Created: 2026-09-28
 * Description: The signed QR token for one reservation, returned by
 *              GET /api/reservations/{id}/qr. The client draws the QR code itself from
 *              "token"; the API never renders an image.
 */

namespace Microgrid.Api.DTOs;

/// <summary>
/// A signed, time-limited token a prosumer's app shows as a QR code at the station.
/// </summary>
public class ReservationQrResponse
{
    /// <summary>The signed token. Opaque to clients; only the API can verify it.</summary>
    public string Token { get; set; } = string.Empty;

    /// <summary>Id of the reservation the token was issued for.</summary>
    public string ReservationId { get; set; } = string.Empty;

    /// <summary>When the token stops being valid, in UTC.</summary>
    public DateTime ExpiresAt { get; set; }
}
