/*
 * File: ReservationScope.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Member D
 * Created: 2026-09-28
 * Description: Valid values for the "scope" filter on GET /api/reservations, kept as
 *              constants so the same spelling is used in the service, the docs and both
 *              clients, the same way ReservationStatus already does for "status".
 */

namespace Microgrid.Api.Models;

/// <summary>
/// Scope values accepted by the "scope" query parameter on GET /api/reservations.
/// </summary>
public static class ReservationScopes
{
    /// <summary>Still holds its slot (Pending or Approved) and that slot has not ended yet.</summary>
    public const string Current = "current";

    /// <summary>Finished: Completed, Cancelled, or its slot's end time has already passed.</summary>
    public const string History = "history";

    /// <summary>No scope narrowing. The default when the caller sends no scope at all.</summary>
    public const string All = "all";

    /// <summary>Every valid scope, used to check the scope filter on the list endpoint.</summary>
    public static readonly string[] AllValues = [Current, History, All];
}
