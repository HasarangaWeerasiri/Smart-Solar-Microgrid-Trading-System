/*
 * File: IReservationService.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: IT23245556 Hasaranga Weerasiri
 * Created: 2026-09-23
 * Description: Contract for managing energy slot reservations. Creating, listing, updating,
 *              cancelling and approving bookings all sit behind this interface, together with
 *              the 7 day rule, the 12 hour rule and the "own bookings only" rule for prosumers.
 */

using Microgrid.Api.DTOs;

namespace Microgrid.Api.Services.Interfaces;

/// <summary>
/// Energy reservation management used by the Android app and the web app.
/// </summary>
public interface IReservationService
{
    /// <summary>
    /// Books a slot. A prosumer books for themselves; staff book for the prosumer whose NIC
    /// is given. The slot must start in the future and no more than 7 days from now.
    /// </summary>
    Task<ServiceResult<ReservationResponse>> CreateAsync(CreateReservationRequest request, string callerId, string callerRole);

    /// <summary>
    /// Lists reservations, latest reservation time first. A prosumer only ever sees their own;
    /// staff see all and can filter by status, NIC and station.
    /// </summary>
    Task<ServiceResult<List<ReservationResponse>>> GetAllAsync(string? status, string? nic, string? stationId, string callerId, string callerRole);

    /// <summary>
    /// Returns one reservation. A prosumer may only read their own.
    /// </summary>
    Task<ServiceResult<ReservationResponse>> GetByIdAsync(string id, string callerId, string callerRole);

    /// <summary>
    /// Moves a reservation to another slot. Needs at least 12 hours' notice before the current
    /// reservation time, and the new slot must pass the 7 day rule. The booking goes back to
    /// Pending so staff approve the new slot.
    /// </summary>
    Task<ServiceResult<ReservationResponse>> UpdateAsync(string id, UpdateReservationRequest request, string callerId, string callerRole);

    /// <summary>
    /// Cancels a reservation. Needs at least 12 hours' notice before the reservation time.
    /// </summary>
    Task<ServiceResult<ReservationResponse>> CancelAsync(string id, string callerId, string callerRole);

    /// <summary>
    /// Approves a Pending reservation. Staff only; the controller enforces the role.
    /// </summary>
    Task<ServiceResult<ReservationResponse>> ApproveAsync(string id, string callerId);

    /// <summary>
    /// True when the station has a Pending or Approved reservation that has not ended yet.
    /// Used to block deactivating a station that still has active bookings.
    /// </summary>
    Task<bool> HasActiveReservationsForStationAsync(string stationId);

    /// <summary>
    /// True when the slot is held by a Pending or Approved reservation that has not ended yet.
    /// Used to stop a booked slot's time being changed, or the slot being deactivated.
    /// </summary>
    Task<bool> HasActiveReservationsForSlotAsync(string slotId);
}
