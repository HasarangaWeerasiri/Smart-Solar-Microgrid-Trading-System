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
 *              (Dashboard summary, complete, and QR issue/verify added by Member D, 2026-09-28.)
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
    /// Lists reservations, paged. Optional filters: status, nic, stationId, from/to (ISO 8601,
    /// on the slot start time), scope ("current" | "history" | "all") and search (matches
    /// prosumer NIC, prosumer name or station name). A prosumer always gets only their own
    /// bookings. Does not use <see cref="ApiControllerBase.ToResponse{T}"/> like the other
    /// actions, because the total count, page and page size need to go on the response as
    /// X-Total-Count / X-Page / X-Page-Size headers while the body stays a plain
    /// ReservationResponse[] for backward compatibility with every existing caller.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? status,
        [FromQuery] string? nic,
        [FromQuery] string? stationId,
        [FromQuery] string? from,
        [FromQuery] string? to,
        [FromQuery] string? scope,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var result = await _reservationService.GetAllAsync(
            status, nic, stationId, from, to, scope, search, page, pageSize, CurrentUserId, CurrentUserRole);

        if (!result.Success)
        {
            return StatusCode(result.StatusCode, new { error = result.Error });
        }

        Response.Headers["X-Total-Count"] = result.Data!.TotalCount.ToString();
        Response.Headers["X-Page"] = result.Data.Page.ToString();
        Response.Headers["X-Page-Size"] = result.Data.PageSize.ToString();

        return StatusCode(result.StatusCode, result.Data.Items);
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
    /// Cancels a reservation (needs 12 hours' notice). Also answers POST on the same route,
    /// because Android's built-in HttpURLConnection cannot send PATCH requests.
    /// </summary>
    [HttpPatch("{id}/cancel")]
    [HttpPost("{id}/cancel")]
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

    /// <summary>
    /// Reservation counts by status, for dashboard tiles. A prosumer gets counts for their
    /// own bookings only; staff get system-wide counts.
    /// </summary>
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        return ToResponse(await _reservationService.GetSummaryAsync(CurrentUserId, CurrentUserRole));
    }

    /// <summary>
    /// Marks an Approved reservation Completed, once a Grid Operator has verified its QR code
    /// and finished the transfer. Also answers POST on the same route, because Android's
    /// HttpURLConnection cannot send PATCH requests.
    /// </summary>
    [HttpPatch("{id}/complete")]
    [HttpPost("{id}/complete")]
    [Authorize(Policy = "StaffOnly")]
    public async Task<IActionResult> Complete(string id)
    {
        return ToResponse(await _reservationService.CompleteAsync(id, CurrentUserId));
    }

    /// <summary>
    /// Issues a signed QR token for an Approved reservation. The reservation's owner or any
    /// staff member may request it.
    /// </summary>
    [HttpGet("{id}/qr")]
    public async Task<IActionResult> GetQr(string id)
    {
        return ToResponse(await _reservationService.GetQrAsync(id, CurrentUserId, CurrentUserRole));
    }

    /// <summary>
    /// Verifies a token scanned from a prosumer's QR code and returns the booking it belongs
    /// to. Read-only: never changes the reservation's status. Backoffice and Grid Operator
    /// staff only.
    /// </summary>
    [HttpPost("verify-qr")]
    [Authorize(Policy = "StaffOnly")]
    public async Task<IActionResult> VerifyQr([FromBody] VerifyQrRequest request)
    {
        return ToResponse(await _reservationService.VerifyQrAsync(request));
    }
}
