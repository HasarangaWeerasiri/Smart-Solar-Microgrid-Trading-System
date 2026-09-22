/*
 * File: UsersController.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: Staff user management endpoints (Backoffice and Grid Operator accounts).
 *              Only Backoffice can reach any of them. The controller stays thin: it reads
 *              the request and the caller's id, calls StaffService, and returns its result.
 */

using Microgrid.Api.DTOs;
using Microgrid.Api.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Microgrid.Api.Controllers;

[Route("api/users")]
[Authorize(Policy = "BackofficeOnly")]
public class UsersController : ApiControllerBase
{
    private readonly IStaffService _staffService;

    /// <summary>
    /// Creates the controller with the staff service supplied by dependency injection.
    /// </summary>
    public UsersController(IStaffService staffService)
    {
        _staffService = staffService;
    }

    /// <summary>
    /// Lists staff accounts. Optional filters: ?role=GridOperator and ?status=Active.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? role, [FromQuery] string? status)
    {
        return ToResponse(await _staffService.GetAllAsync(role, status));
    }

    /// <summary>
    /// Returns one staff account by id.
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        return ToResponse(await _staffService.GetByIdAsync(id));
    }

    /// <summary>
    /// Creates a Backoffice or Grid Operator account. Returns 201 with the new account.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateStaffRequest request)
    {
        return ToResponse(await _staffService.CreateAsync(request));
    }

    /// <summary>
    /// Updates a staff account. Leave NewPassword empty to keep the current password.
    /// </summary>
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateStaffRequest request)
    {
        return ToResponse(await _staffService.UpdateAsync(id, request, CurrentUserId));
    }

    /// <summary>
    /// Deactivates a staff account so it can no longer log in.
    /// </summary>
    [HttpPatch("{id}/deactivate")]
    public async Task<IActionResult> Deactivate(string id)
    {
        return ToResponse(await _staffService.DeactivateAsync(id, CurrentUserId));
    }

    /// <summary>
    /// Reactivates a deactivated staff account.
    /// </summary>
    [HttpPatch("{id}/activate")]
    public async Task<IActionResult> Activate(string id)
    {
        return ToResponse(await _staffService.ActivateAsync(id));
    }
}
