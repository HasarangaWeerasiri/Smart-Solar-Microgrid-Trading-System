/*
 * File: UpdateSlotAvailabilityRequest.cs
 * Author: IT23218062 - Sanjula Mohotti
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Description: Data received from a Grid Operator when updating
 *              the availability of an energy booking slot.
 */

namespace Microgrid.Api.DTOs;

/// Request data used to update the availability of an energy booking slot.
public class UpdateSlotAvailabilityRequest
{
    /// Whether the slot is currently available for booking.
    public bool IsAvailable { get; set; }
}