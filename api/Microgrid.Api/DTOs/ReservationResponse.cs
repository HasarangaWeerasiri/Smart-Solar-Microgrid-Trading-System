/*
 * File: ReservationResponse.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: IT23245556 Hasaranga Weerasiri
 * Created: 2026-09-23
 * Description: The reservation details sent back to the web and mobile clients. Besides the
 *              stored ids it carries the prosumer, station and slot names, so the clients can
 *              show a readable booking without extra calls, and a CanModify flag worked out by
 *              the API, so the clients never have to apply the 12 hour rule themselves.
 */

using Microgrid.Api.Models;

namespace Microgrid.Api.DTOs;

/// <summary>
/// Client-facing view of one energy reservation.
/// </summary>
public class ReservationResponse
{
    /// <summary>MongoDB identifier of the reservation.</summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>NIC of the prosumer who owns the booking.</summary>
    public string ProsumerNic { get; set; } = string.Empty;

    /// <summary>Full name of the prosumer, or null if the account no longer exists.</summary>
    public string? ProsumerName { get; set; }

    /// <summary>Id of the solar station.</summary>
    public string StationId { get; set; } = string.Empty;

    /// <summary>Name of the solar station, or null if it no longer exists.</summary>
    public string? StationName { get; set; }

    /// <summary>Id of the booked slot.</summary>
    public string SlotId { get; set; } = string.Empty;

    /// <summary>Name of the booked slot, or null if it no longer exists.</summary>
    public string? SlotName { get; set; }

    /// <summary>Reservation date and time (slot start), in UTC.</summary>
    public DateTime ReservationStart { get; set; }

    /// <summary>End of the reserved slot, in UTC.</summary>
    public DateTime ReservationEnd { get; set; }

    /// <summary>Pending, Approved, Completed or Cancelled.</summary>
    public string Status { get; set; } = string.Empty;

    /// <summary>
    /// True when the booking can still be updated or cancelled right now: it is Pending or
    /// Approved and starts at least 12 hours from now. Clients use it to show or hide buttons.
    /// </summary>
    public bool CanModify { get; set; }

    /// <summary>When the reservation was created, in UTC.</summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>User id of whoever created it.</summary>
    public string CreatedBy { get; set; } = string.Empty;

    /// <summary>When the reservation was last changed, in UTC.</summary>
    public DateTime UpdatedAt { get; set; }

    /// <summary>When staff approved it, in UTC.</summary>
    public DateTime? ApprovedAt { get; set; }

    /// <summary>User id of the staff member who approved it.</summary>
    public string? ApprovedBy { get; set; }

    /// <summary>When it was cancelled, in UTC.</summary>
    public DateTime? CancelledAt { get; set; }

    /// <summary>User id of whoever cancelled it.</summary>
    public string? CancelledBy { get; set; }

    /// <summary>When the energy transfer was finished, in UTC.</summary>
    public DateTime? CompletedAt { get; set; }

    /// <summary>User id of the Grid Operator who finished it.</summary>
    public string? CompletedBy { get; set; }

    /// <summary>
    /// Copies a stored reservation into a response. The names are looked up by the service
    /// and passed in; canModify is decided by the service's 12 hour rule.
    /// </summary>
    public static ReservationResponse FromReservation(
        EnergyReservation reservation,
        string? prosumerName,
        string? stationName,
        string? slotName,
        bool canModify)
    {
        return new ReservationResponse
        {
            Id = reservation.Id ?? string.Empty,
            ProsumerNic = reservation.ProsumerNic,
            ProsumerName = prosumerName,
            StationId = reservation.StationId,
            StationName = stationName,
            SlotId = reservation.SlotId,
            SlotName = slotName,
            ReservationStart = reservation.ReservationStart,
            ReservationEnd = reservation.ReservationEnd,
            Status = reservation.Status,
            CanModify = canModify,
            CreatedAt = reservation.CreatedAt,
            CreatedBy = reservation.CreatedBy,
            UpdatedAt = reservation.UpdatedAt,
            ApprovedAt = reservation.ApprovedAt,
            ApprovedBy = reservation.ApprovedBy,
            CancelledAt = reservation.CancelledAt,
            CancelledBy = reservation.CancelledBy,
            CompletedAt = reservation.CompletedAt,
            CompletedBy = reservation.CompletedBy
        };
    }
}
