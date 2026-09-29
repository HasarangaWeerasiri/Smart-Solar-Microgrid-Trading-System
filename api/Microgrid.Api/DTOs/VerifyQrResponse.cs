/*
 * File: VerifyQrResponse.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Member D
 * Created: 2026-09-28
 * Description: What a Grid Operator's screen shows after a QR code is verified. Sent by
 *              POST /api/reservations/verify-qr, which never changes the reservation's status.
 */

namespace Microgrid.Api.DTOs;

/// <summary>
/// Reservation details shown to a Grid Operator after a successful QR check.
/// </summary>
public class VerifyQrResponse
{
    /// <summary>Id of the reservation the QR code belongs to.</summary>
    public string ReservationId { get; set; } = string.Empty;

    /// <summary>NIC of the prosumer the booking belongs to.</summary>
    public string ProsumerNic { get; set; } = string.Empty;

    /// <summary>Full name of the prosumer, or null if the account no longer exists.</summary>
    public string? ProsumerFullName { get; set; }

    /// <summary>Name of the solar station, or null if it no longer exists.</summary>
    public string? StationName { get; set; }

    /// <summary>Name of the booked slot, or null if it no longer exists.</summary>
    public string? SlotName { get; set; }

    /// <summary>Start of the reserved slot, in UTC.</summary>
    public DateTime StartTime { get; set; }

    /// <summary>End of the reserved slot, in UTC.</summary>
    public DateTime EndTime { get; set; }

    /// <summary>The reservation's status at the moment of verification.</summary>
    public string Status { get; set; } = string.Empty;
}
