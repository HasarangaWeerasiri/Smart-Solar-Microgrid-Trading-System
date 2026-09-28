/*
 * File: ReservationSummaryResponse.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Member D
 * Created: 2026-09-28
 * Description: Reservation counts by status, returned by GET /api/reservations/summary. A
 *              prosumer gets counts for their own bookings only; staff get system-wide counts.
 */

namespace Microgrid.Api.DTOs;

/// <summary>
/// Counts of reservations in each status, used to drive dashboard tiles.
/// </summary>
public class ReservationSummaryResponse
{
    /// <summary>Number of Pending reservations.</summary>
    public int Pending { get; set; }

    /// <summary>Number of Approved reservations.</summary>
    public int Approved { get; set; }

    /// <summary>Number of Completed reservations.</summary>
    public int Completed { get; set; }

    /// <summary>Number of Cancelled reservations.</summary>
    public int Cancelled { get; set; }

    /// <summary>
    /// Number of Approved reservations whose slot still starts in the future. The marking
    /// scheme asks for this count specifically, separate from the total Approved count.
    /// </summary>
    public int ApprovedUpcoming { get; set; }
}
