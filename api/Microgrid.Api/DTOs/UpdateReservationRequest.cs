/*
 * File: UpdateReservationRequest.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: IT23245556 Hasaranga Weerasiri
 * Created: 2026-09-23
 * Description: Details for changing an existing reservation. Changing a booking means moving
 *              it to another slot, which may be at the same station or a different one.
 */

using System.ComponentModel.DataAnnotations;

namespace Microgrid.Api.DTOs;

/// <summary>
/// Request body for PUT /api/reservations/{id}.
/// </summary>
public class UpdateReservationRequest
{
    /// <summary>Id of the new energy booking slot.</summary>
    [Required(ErrorMessage = "Slot is required.")]
    public string SlotId { get; set; } = string.Empty;
}
