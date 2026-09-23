/*
 * File: EnergyBookingSlot.cs
 * Author: IT23218062 - Sanjula Mohotti
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Description: Document stored in the EnergyBookingSlots collection.
 *              Represents an available energy booking time slot
 *              belonging to a solar microgrid station.
 */

/*
 * Status = Active + IsAvailable = true
 * → slot is enabled and available
 *
 * Status = Active + IsAvailable = false
 * → slot is enabled but currently unavailable
 *
 * Status = Deactivated
 * → operator has disabled the slot
 */

using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Microgrid.Api.Models;

/// Represents an energy booking slot belonging to a solar station.
public class EnergyBookingSlot
{
  
    /// Unique MongoDB identifier for the booking slot.
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    /// MongoDB identifier of the station that owns this slot.
    [BsonRepresentation(BsonType.ObjectId)]
    public string StationId { get; set; } = string.Empty;

    /// Display name of the booking slot.
    public string SlotName { get; set; } = string.Empty;

    /// Start date and time of the booking slot.
    public DateTime StartTime { get; set; }

    /// End date and time of the booking slot.
    public DateTime EndTime { get; set; }

    /// Indicates whether the slot is currently available for booking.
    public bool IsAvailable { get; set; } = true;

    /// Current status of the slot.
    [BsonRepresentation(BsonType.String)]
    public SlotStatus Status { get; set; } = SlotStatus.Active; 

    /// Date and time when the slot was created.
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// Date and time when the slot was last updated.
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}