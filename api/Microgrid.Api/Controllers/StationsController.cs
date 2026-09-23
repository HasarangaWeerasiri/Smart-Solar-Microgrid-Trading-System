/*
 * File: StationsController.cs
 * Author: IT23218062 - Sanjula Mohotti
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Description: Solar microgrid station management endpoints. Any authenticated user
 *              can view station information. Only Backoffice can create, update,
 *              deactivate or reactivate stations.
 */

using Microgrid.Api.DTOs;
using Microgrid.Api.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Microgrid.Api.Controllers;

[Route("api/stations")]
[Authorize]
public class StationsController : ApiControllerBase
{
    private readonly IStationService _stationService;

    /// Creates the controller with the station service supplied by dependency injection.
    public StationsController(IStationService stationService)
    {
        _stationService = stationService;
    }

    /// Returns all solar microgrid stations.
    /// Available to any authenticated user.
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        return ToResponse(await _stationService.GetAllAsync());
    }

    /// Returns one solar microgrid station by id.
    /// Available to any authenticated user.
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        return ToResponse(await _stationService.GetByIdAsync(id));
    }

    /// Creates a new solar microgrid station.
    /// Only Backoffice can register stations.
    [HttpPost]
    [Authorize(Policy = "BackofficeOnly")]
    public async Task<IActionResult> Create(
        [FromBody] CreateStationRequest request)
    {
        return ToResponse(
            await _stationService.CreateAsync(request));
    }

    /// Updates station details, GPS location, capacity and operating schedule.
    /// Only Backoffice can update station information.
    [HttpPut("{id}")]
    [Authorize(Policy = "BackofficeOnly")]
    public async Task<IActionResult> Update(
        string id,
        [FromBody] UpdateStationRequest request)
    {
        return ToResponse(
            await _stationService.UpdateAsync(id, request));
    }

    /// Deactivates a station.
    /// Deactivation must be rejected when active reservations exist.
    /// Only Backoffice can deactivate stations.
    [HttpPatch("{id}/deactivate")]
    [Authorize(Policy = "BackofficeOnly")]
    public async Task<IActionResult> Deactivate(string id)
    {
        return ToResponse(
            await _stationService.DeactivateAsync(id));
    }


    /// Reactivates a previously deactivated station.
    /// Only Backoffice can reactivate stations.
    [HttpPatch("{id}/activate")]
    [Authorize(Policy = "BackofficeOnly")]
    public async Task<IActionResult> Activate(string id)
    {
        return ToResponse(
            await _stationService.ActivateAsync(id));
    }
}