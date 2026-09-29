/*
 * File: SlotsController.cs
 * Author: IT23218062 - Sanjula Mohotti
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

    /// Creates the controller with the slot service supplied by dependency injection.
    public SlotsController(ISlotService slotService)
    {
        _slotService = slotService;
    }

    /// Returns all booking slots belonging to a station.
    /// Available to all authenticated users.
    [HttpGet("stations/{stationId}/slots")]
    public async Task<IActionResult> GetByStation(string stationId)
    {
        return ToResponse(
            await _slotService.GetByStationAsync(stationId));
    }

    /// Returns one booking slot by id.
    /// Available to all authenticated users.
    [HttpGet("slots/{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        return ToResponse(
            await _slotService.GetByIdAsync(id));
    }

    /// Creates a new booking slot under a solar station.
    /// Only Backoffice can create slots.
    [HttpPost("stations/{stationId}/slots")]
    [Authorize(Policy = "BackofficeOnly")]
    public async Task<IActionResult> Create(
        string stationId,
        [FromBody] CreateSlotRequest request)
    {
        return ToResponse(
            await _slotService.CreateAsync(stationId, request));
    }

    /// Updates the definition and schedule of a booking slot.
    /// Only Backoffice can update slot details.
    [HttpPut("slots/{id}")]
    [Authorize(Policy = "BackofficeOnly")]
    public async Task<IActionResult> Update(
        string id,
        [FromBody] UpdateSlotRequest request)
    {
        return ToResponse(
            await _slotService.UpdateAsync(id, request));
    }

    /// Deactivates a booking slot and makes it unavailable.
    /// Only Backoffice can deactivate slots.
    [HttpPatch("slots/{id}/deactivate")]
    [Authorize(Policy = "BackofficeOnly")]
    public async Task<IActionResult> Deactivate(string id)
    {
        return ToResponse(
            await _slotService.DeactivateAsync(id));
    }

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

    /// Updates whether an active booking slot is currently available.
    /// Only Grid Operators can update operational slot availability.
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