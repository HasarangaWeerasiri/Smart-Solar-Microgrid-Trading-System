/*
 * File: EnergyReservation.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: IT23245556 Hasaranga Weerasiri
 * Created: 2026-09-23
 * Description: Document stored in the EnergyReservation collection. One reservation books one
 *              energy slot at one solar station for one prosumer. It points to the other
 *              collections by id: ProsumerNic -> Users._id, StationId -> SolarStationInfo._id,
 *              SlotId -> EnergyBookingSlots._id.
 */

using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Microgrid.Api.Models;

/// <summary>
/// A single energy drop-off or charging booking.
/// </summary>
public class EnergyReservation
{
    /// <summary>Unique MongoDB identifier for the reservation.</summary>
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    /// <summary>NIC of the prosumer who owns the booking. This is the prosumer's _id in Users.</summary>
    public string ProsumerNic { get; set; } = string.Empty;

    /// <summary>Id of the solar station (SolarStationInfo) the energy is traded at.</summary>
    [BsonRepresentation(BsonType.ObjectId)]
    public string StationId { get; set; } = string.Empty;

    /// <summary>Id of the booked slot (EnergyBookingSlots).</summary>
    [BsonRepresentation(BsonType.ObjectId)]
    public string SlotId { get; set; } = string.Empty;

    /// <summary>
    /// Reservation date and time, copied from the slot's start time when booked, in UTC.
    /// The 7 day and 12 hour rules are measured against this value.
    /// </summary>
    public DateTime ReservationStart { get; set; }

    /// <summary>End of the reserved slot, copied from the slot, in UTC.</summary>
    public DateTime ReservationEnd { get; set; }

    /// <summary>One of the values in <see cref="ReservationStatus"/>.</summary>
    public string Status { get; set; } = ReservationStatus.Pending;

    /// <summary>When the reservation was created, in UTC.</summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>User id of whoever created it: the prosumer's NIC, or a staff member's id.</summary>
    public string CreatedBy { get; set; } = string.Empty;

    /// <summary>When the reservation was last changed, in UTC.</summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>When staff approved it, in UTC. Null until approved, and cleared if the slot changes.</summary>
    public DateTime? ApprovedAt { get; set; }

    /// <summary>User id of the staff member who approved it.</summary>
    public string? ApprovedBy { get; set; }

    /// <summary>When it was cancelled, in UTC. Null unless cancelled.</summary>
    public DateTime? CancelledAt { get; set; }

    /// <summary>User id of whoever cancelled it: the prosumer or a staff member.</summary>
    public string? CancelledBy { get; set; }

    /// <summary>When the energy transfer was finished after the QR check, in UTC.</summary>
    public DateTime? CompletedAt { get; set; }

    /// <summary>User id of the Grid Operator who finished the transfer.</summary>
    public string? CompletedBy { get; set; }
}
