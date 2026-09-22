/*
 * File: ProsumersController.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: Solar prosumer account endpoints, used by the Android app for registration
 *              and profile changes, and by the Backoffice web pages for approvals. The NIC
 *              in the route is the account id. The controller stays thin: it reads who is
 *              calling from the token and lets ProsumerService apply the rules.
 */

using Microgrid.Api.DTOs;
using Microgrid.Api.Models;
using Microgrid.Api.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Microgrid.Api.Controllers;

[Route("api/prosumers")]
public class ProsumersController : ApiControllerBase
{
    private readonly IProsumerService _prosumerService;

    /// <summary>
    /// Creates the controller with the prosumer service supplied by dependency injection.
    /// </summary>
    public ProsumersController(IProsumerService prosumerService)
    {
        _prosumerService = prosumerService;
    }

    /// <summary>
    /// Registers a prosumer. Open to anyone, because a new prosumer has no account yet and
    /// so cannot have a token. When a Backoffice officer calls it with their token, the new
    /// account is created Active instead of Pending.
    /// </summary>
    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] RegisterProsumerRequest request)
    {
        var createdByBackoffice = CurrentUserRole == Roles.Backoffice;
        return ToResponse(await _prosumerService.RegisterAsync(request, createdByBackoffice));
    }

    /// <summary>
    /// Lists prosumers. Use ?status=Pending for the web app's pending activations page.
    /// </summary>
    [HttpGet]
    [Authorize(Policy = "BackofficeOnly")]
    public async Task<IActionResult> GetAll([FromQuery] string? status)
    {
        return ToResponse(await _prosumerService.GetAllAsync(status));
    }

    /// <summary>
    /// Returns one prosumer profile. A prosumer may only read their own; Backoffice may read any.
    /// </summary>
    [HttpGet("{nic}")]
    [Authorize]
    public async Task<IActionResult> GetByNic(string nic)
    {
        return ToResponse(await _prosumerService.GetByNicAsync(nic, CurrentUserId, CurrentUserRole));
    }

    /// <summary>
    /// Updates a prosumer profile. The NIC cannot be changed, because it is the account id.
    /// </summary>
    [HttpPut("{nic}")]
    [Authorize]
    public async Task<IActionResult> Update(string nic, [FromBody] UpdateProsumerRequest request)
    {
        return ToResponse(await _prosumerService.UpdateAsync(nic, request, CurrentUserId, CurrentUserRole));
    }

    /// <summary>
    /// Deactivates a prosumer account. A prosumer can request this for themselves from the
    /// mobile app, and a Backoffice officer can do it from the web app.
    /// </summary>
    [HttpPatch("{nic}/deactivate")]
    [Authorize]
    public async Task<IActionResult> Deactivate(string nic)
    {
        return ToResponse(await _prosumerService.DeactivateAsync(nic, CurrentUserId, CurrentUserRole));
    }

    /// <summary>
    /// Approves a Pending registration or reactivates a Deactivated account.
    /// Backoffice only, which is the spec rule that only Backoffice can reactivate.
    /// </summary>
    [HttpPatch("{nic}/activate")]
    [Authorize(Policy = "BackofficeOnly")]
    public async Task<IActionResult> Activate(string nic)
    {
        return ToResponse(await _prosumerService.ActivateAsync(nic));
    }
}
