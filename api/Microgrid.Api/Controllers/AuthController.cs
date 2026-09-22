/*
 * File: AuthController.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: Login and identity endpoints. The controller stays thin: it takes the
 *              request, hands it to the user service, and turns the result into an HTTP
 *              response. All account rules live in the service.
 */

using System.Security.Claims;
using Microgrid.Api.DTOs;
using Microgrid.Api.Models;
using Microgrid.Api.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Microgrid.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IUserService _userService;

    /// <summary>
    /// Creates the controller with the user service supplied by dependency injection.
    /// </summary>
    public AuthController(IUserService userService)
    {
        _userService = userService;
    }

    /// <summary>
    /// Logs a user in. Staff send their email, prosumers send their NIC.
    /// Returns 200 with a token, 401 for wrong details, or 403 when the account is
    /// Pending or Deactivated.
    /// </summary>
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var result = await _userService.LoginAsync(request);

        // The service decided the status code, so the controller just passes it on.
        if (!result.Success)
        {
            return StatusCode(result.StatusCode, new { error = result.Error });
        }

        return Ok(result.Response);
    }

    /// <summary>
    /// Returns the details of the user who owns the token on the request.
    /// Used by both clients to restore a session and to show the user's name.
    /// </summary>
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        // The id was put into the token at login, so it is read back from the claims.
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized(new { error = "The token does not identify a user." });
        }

        var user = await _userService.GetByIdAsync(userId);
        if (user is null)
        {
            return NotFound(new { error = "This user no longer exists." });
        }

        return Ok(new
        {
            userId = user.Id,
            nic = user.Nic,
            fullName = user.FullName,
            email = user.Email,
            role = user.Role,
            status = user.Status
        });
    }

    /// <summary>
    /// Small check used to prove role-based access works. Only a Backoffice token is
    /// accepted: no token gives 401 and a GridOperator or Prosumer token gives 403.
    /// </summary>
    [HttpGet("admin-check")]
    [Authorize(Roles = Roles.Backoffice)]
    public IActionResult AdminCheck()
    {
        return Ok(new { message = "Backoffice access confirmed." });
    }
}
