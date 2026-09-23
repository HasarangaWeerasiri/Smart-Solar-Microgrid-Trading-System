/*
 * File: ISlotService.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Description: Defines the service operations used to manage
 *              energy booking slots belonging to solar stations.
 */

using Microgrid.Api.DTOs;

namespace Microgrid.Api.Services.Interfaces;

/// Defines business operations for energy booking slots.
public interface ISlotService
{
    /// Gets all booking slots belonging to a solar station.
    /// <param name="stationId">Station identifier.</param>
    Task<ServiceResult<List<SlotResponse>>> GetByStationAsync(
        string stationId);

    /// Gets one booking slot by its MongoDB identifier.
    /// <param name="id">Booking slot identifier.</param>
    Task<ServiceResult<SlotResponse>> GetByIdAsync(string id);

    /// Creates a new booking slot under a solar station.
    /// <param name="stationId">Station identifier.</param>
    /// <param name="request">Booking slot details.</param>
    Task<ServiceResult<SlotResponse>> CreateAsync(
        string stationId,
        CreateSlotRequest request);

    /// Updates an existing booking slot.
    /// <param name="id">Booking slot identifier.</param>
    /// <param name="request">Updated booking slot details.</param>
    Task<ServiceResult<SlotResponse>> UpdateAsync(
        string id,
        UpdateSlotRequest request);

    /// Deactivates a booking slot.
    /// <param name="id">Booking slot identifier.</param>
    Task<ServiceResult<SlotResponse>> DeactivateAsync(string id);

    /// Reactivates a previously deactivated booking slot.
    /// <param name="id">Booking slot identifier.</param>
    Task<ServiceResult<SlotResponse>> ActivateAsync(string id);

    /// Updates whether an active booking slot is currently available.
    /// <param name="id">Booking slot identifier.</param>
    /// <param name="request">The new availability state of the slot.</param>
    Task<ServiceResult<SlotResponse>> UpdateAvailabilityAsync(
        string id,
        UpdateSlotAvailabilityRequest request);
}