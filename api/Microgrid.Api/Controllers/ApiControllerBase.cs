/*
 * File: ApiControllerBase.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: Shared helpers for the feature controllers. Reads who is calling from the
 *              JWT and turns a ServiceResult into an HTTP response, so every controller
 *              answers in the same way: the data on success, { "error": "..." } on failure.
 */

using System.Security.Claims;
using Microgrid.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Microgrid.Api.Controllers;

/// <summary>
/// Base class for controllers that hand their work to a service.
/// </summary>
[ApiController]
public abstract class ApiControllerBase : ControllerBase
{
    /// <summary>
    /// Id of the logged-in caller, read from the token. For a prosumer this is the NIC.
    /// Empty when the request carries no token.
    /// </summary>
    protected string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;

    /// <summary>
    /// Role of the logged-in caller, read from the signed token, so a client cannot fake it.
    /// Empty when the request carries no token.
    /// </summary>
    protected string CurrentUserRole => User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;

    /// <summary>
    /// Sends a service result back to the client with the status the service chose.
    /// </summary>
    protected IActionResult ToResponse<T>(ServiceResult<T> result)
    {
        if (!result.Success)
        {
            return StatusCode(result.StatusCode, new { error = result.Error });
        }

        return StatusCode(result.StatusCode, result.Data);
    }
}
