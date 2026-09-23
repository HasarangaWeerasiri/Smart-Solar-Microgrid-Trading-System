/*
 * File: UpdateSlotRequest.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Description: Data received from the client when updating
 *              an existing energy booking slot.
 */

namespace Microgrid.Api.DTOs;

/// Request data used to update an existing energy booking slot.
public class UpdateSlotRequest
{
    /// Name of the booking slot.
    public string SlotName { get; set; } = string.Empty;

    /// Start date and time of the slot.
    public DateTime StartTime { get; set; }

    /// End date and time of the slot.
    public DateTime EndTime { get; set; }

    /// Whether the slot is available for booking.
    public bool IsAvailable { get; set; }
}