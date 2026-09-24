/*
 * File: CreateReservationRequest.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: IT23245556 Hasaranga Weerasiri
 * Created: 2026-09-23
 * Description: Details for a new energy reservation. The station and the date/time come from
 *              the chosen slot, so the client only sends the slot id (and the prosumer's NIC
 *              when a staff member books on a prosumer's behalf).
 */

using System.ComponentModel.DataAnnotations;

namespace Microgrid.Api.DTOs;

/// <summary>
/// Request body for POST /api/reservations.
/// </summary>
public class CreateReservationRequest
{
    /// <summary>
    /// NIC of the prosumer the booking is for. Required when staff book from the web app.
    /// A prosumer booking from the mobile app can leave it empty: their own NIC is used.
    /// </summary>
    public string? Nic { get; set; }

    /// <summary>Id of the energy booking slot to reserve.</summary>
    [Required(ErrorMessage = "Slot is required.")]
    public string SlotId { get; set; } = string.Empty;
}
