/*
 * File: ReservationListResult.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Member D
 * Created: 2026-09-28
 * Description: What ReservationService.GetAllAsync hands back to the controller: the page of
 *              reservations plus enough paging information to fill the X-Total-Count, X-Page
 *              and X-Page-Size response headers. Never sent to a client as its own JSON body -
 *              the controller unwraps Items into the response body so GET /api/reservations
 *              keeps returning a plain ReservationResponse[], exactly as it always has.
 */

using Microgrid.Api.DTOs;

namespace Microgrid.Api.Services;

/// <summary>
/// One page of reservations, together with the total number of matching rows and the page
/// that was actually served (after clamping page/pageSize to their valid ranges).
/// </summary>
public sealed record ReservationListResult(List<ReservationResponse> Items, long TotalCount, int Page, int PageSize);
