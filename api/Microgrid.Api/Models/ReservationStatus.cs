/*
 * File: ReservationStatus.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: IT23245556 Hasaranga Weerasiri
 * Created: 2026-09-23
 * Description: The four states of an energy reservation, kept as constants so the same
 *              spelling is used in the database, in the services and in both clients.
 */

namespace Microgrid.Api.Models;

/// <summary>
/// Status values stored on an EnergyReservation document.
/// Life cycle: Pending -> Approved -> Completed, or Pending/Approved -> Cancelled.
/// </summary>
public static class ReservationStatus
{
    /// <summary>Booked by a prosumer or staff member, waiting for staff approval.</summary>
    public const string Pending = "Pending";

    /// <summary>Approved by staff. The prosumer can now show the transaction QR code.</summary>
    public const string Approved = "Approved";

    /// <summary>The energy transfer was verified and finished by a Grid Operator.</summary>
    public const string Completed = "Completed";

    /// <summary>Cancelled by the prosumer or by staff. The slot is free again.</summary>
    public const string Cancelled = "Cancelled";

    /// <summary>Every valid status, used to check the status filter on the list endpoint.</summary>
    public static readonly string[] All = [Pending, Approved, Completed, Cancelled];

    /// <summary>
    /// Statuses that still hold the slot and can still be changed or cancelled.
    /// A reservation in one of these counts as an "active" reservation.
    /// </summary>
    public static readonly string[] Active = [Pending, Approved];
}
