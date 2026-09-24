/*
 * File: ReservationsController.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: IT23245556 Hasaranga Weerasiri
 * Created: 2026-09-23
 * Description: Energy slot reservation endpoints. Prosumers use them from the Android app to
 *              book, change and cancel their own slots; Backoffice and Grid Operator staff use
 *              them from the web app to manage and approve bookings. The controller stays thin:
 *              it reads who is calling from the token and lets ReservationService apply the
 *              7 day rule, the 12 hour rule and every other booking rule.
 */

using Microgrid.Api.DTOs;
using Microgrid.Api.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Microgrid.Api.Controllers;

[Route("api/reservations")]
[Authorize]
public class ReservationsController : ApiControllerBase
{
    private readonly IReservationService _reservationService;

    /// <summary>
    /// Creates the controller with the reservation service supplied by dependency injection.
    /// </summary>
    public ReservationsController(IReservationService reservationService)
    {
        _reservationService = reservationService;
    }

    /// <summary>
    /// Books an energy slot. A prosumer books for themselves; staff send the prosumer's NIC.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateReservationRequest request)
    {
        return ToResponse(await _reservationService.CreateAsync(request, CurrentUserId, CurrentUserRole));
    }

    /// <summary>
    /// Lists reservations. Optional filters: ?status=Pending&amp;nic=...&amp;stationId=...
    /// A prosumer always gets only their own bookings.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? status, [FromQuery] string? nic, [FromQuery] string? stationId)
    {
        return ToResponse(await _reservationService.GetAllAsync(status, nic, stationId, CurrentUserId, CurrentUserRole));
    }

    /// <summary>
    /// Returns one reservation. A prosumer may only read their own.
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        return ToResponse(await _reservationService.GetByIdAsync(id, CurrentUserId, CurrentUserRole));
    }

    /// <summary>
    /// Moves a reservation to another slot (needs 12 hours' notice; goes back to Pending).
    /// </summary>
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateReservationRequest request)
    {
        return ToResponse(await _reservationService.UpdateAsync(id, request, CurrentUserId, CurrentUserRole));
    }

    /// <summary>
    /// Cancels a reservation (needs 12 hours' notice).
    /// </summary>
    [HttpPatch("{id}/cancel")]
    public async Task<IActionResult> Cancel(string id)
    {
        return ToResponse(await _reservationService.CancelAsync(id, CurrentUserId, CurrentUserRole));
    }

    /// <summary>
    /// Approves a Pending reservation. Backoffice and Grid Operator staff only.
    /// </summary>
    [HttpPatch("{id}/approve")]
    [Authorize(Policy = "StaffOnly")]
    public async Task<IActionResult> Approve(string id)
    {
        return ToResponse(await _reservationService.ApproveAsync(id, CurrentUserId));
    }
}
