/*
 * File: SlotResponse.cs
 * Author: IT23218062 - Sanjula Mohotti
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Description: Energy booking slot information returned
 *              to web and mobile clients.
 */

using Microgrid.Api.Models;

namespace Microgrid.Api.DTOs;


/// Client-facing view of an energy booking slot.

public class SlotResponse
{
    /// MongoDB identifier of the booking slot.
    public string Id { get; set; } = string.Empty;

    /// Identifier of the station that owns this slot.
    public string StationId { get; set; } = string.Empty;

    /// Name of the booking slot.
    public string SlotName { get; set; } = string.Empty;

    /// Start date and time of the slot.
    public DateTime StartTime { get; set; }

    /// End date and time of the slot.
    public DateTime EndTime { get; set; }

    /// Whether the slot is currently available.
    public bool IsAvailable { get; set; }

    /// Current status of the booking slot.
    public string Status { get; set; } = string.Empty;

    /// When the slot was created, in UTC.
    public DateTime CreatedAt { get; set; }

    /// When the slot was last updated, in UTC.
    public DateTime UpdatedAt { get; set; }

    /// Converts a stored EnergyBookingSlot into a client-facing response.
    public static SlotResponse FromSlot(EnergyBookingSlot slot)
    {
        return new SlotResponse
        {
            Id = slot.Id ?? string.Empty,
            StationId = slot.StationId,
            SlotName = slot.SlotName,
            StartTime = slot.StartTime,
            EndTime = slot.EndTime,
            IsAvailable = slot.IsAvailable,
            Status = slot.Status.ToString(),
            CreatedAt = slot.CreatedAt,
            UpdatedAt = slot.UpdatedAt
        };
    }
}