/*
 * File: SlotsController.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Description: Energy booking slot management endpoints.
 *              All authenticated users can view slots.
 *              Backoffice manages slot definitions and status.
 *              Grid Operators manage operational slot availability.
 */

using Microgrid.Api.DTOs;
using Microgrid.Api.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Microgrid.Api.Controllers;

[Route("api")]
[Authorize]
public class SlotsController : ApiControllerBase
{
    private readonly ISlotService _slotService;

    /// <summary>
    /// Creates the controller with the slot service supplied by dependency injection.
    /// </summary>
    public SlotsController(ISlotService slotService)
    {
        _slotService = slotService;
    }

    /// <summary>
    /// Returns all booking slots belonging to a station.
    /// Available to all authenticated users.
    /// </summary>
    [HttpGet("stations/{stationId}/slots")]
    public async Task<IActionResult> GetByStation(string stationId)
    {
        return ToResponse(
            await _slotService.GetByStationAsync(stationId));
    }

    /// <summary>
    /// Returns one booking slot by id.
    /// Available to all authenticated users.
    /// </summary>
    [HttpGet("slots/{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        return ToResponse(
            await _slotService.GetByIdAsync(id));
    }

    /// <summary>
    /// Creates a new booking slot under a solar station.
    /// Only Backoffice can create slots.
    /// </summary>
    [HttpPost("stations/{stationId}/slots")]
    [Authorize(Policy = "BackofficeOnly")]
    public async Task<IActionResult> Create(
        string stationId,
        [FromBody] CreateSlotRequest request)
    {
        return ToResponse(
            await _slotService.CreateAsync(stationId, request));
    }

    /// <summary>
    /// Updates the definition and schedule of a booking slot.
    /// Only Backoffice can update slot details.
    /// </summary>
    [HttpPut("slots/{id}")]
    [Authorize(Policy = "BackofficeOnly")]
    public async Task<IActionResult> Update(
        string id,
        [FromBody] UpdateSlotRequest request)
    {
        return ToResponse(
            await _slotService.UpdateAsync(id, request));
    }

    /// <summary>
    /// Deactivates a booking slot and makes it unavailable.
    /// Only Backoffice can deactivate slots.
    /// </summary>
    [HttpPatch("slots/{id}/deactivate")]
    [Authorize(Policy = "BackofficeOnly")]
    public async Task<IActionResult> Deactivate(string id)
    {
        return ToResponse(
            await _slotService.DeactivateAsync(id));
    }

    /// <summary>
    /// Reactivates a previously deactivated booking slot.
    /// Only Backoffice can reactivate slots.
    /// </summary>
    [HttpPatch("slots/{id}/activate")]
    [Authorize(Policy = "BackofficeOnly")]
    public async Task<IActionResult> Activate(string id)
    {
        return ToResponse(
            await _slotService.ActivateAsync(id));
    }

    /// <summary>
    /// Updates whether an active booking slot is currently available.
    /// Only Grid Operators can update operational slot availability.
    /// </summary>
    [HttpPatch("slots/{id}/availability")]
    [Authorize(Policy = "GridOperatorOnly")]
    public async Task<IActionResult> UpdateAvailability(
        string id,
        [FromBody] UpdateSlotAvailabilityRequest request)
    {
        return ToResponse(
            await _slotService.UpdateAvailabilityAsync(id, request));
    }
}