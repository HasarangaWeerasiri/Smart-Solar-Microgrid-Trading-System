/*
 * File: CreateSlotRequest.cs
 * Author: IT23218062 - Sanjula Mohotti
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Description: Data received from the client when creating
 *              a booking slot for a solar station.
 */

namespace Microgrid.Api.DTOs;


/// Request data required to create an energy booking slot.
public class CreateSlotRequest
{
    ///Name of the booking slot.
    public string SlotName { get; set; } = string.Empty;

    /// Start date and time of the slot.
    public DateTime StartTime { get; set; }

    /// End date and time of the slot.
    public DateTime EndTime { get; set; }

    /// Whether the slot is available for booking.
    public bool IsAvailable { get; set; } = true;
}