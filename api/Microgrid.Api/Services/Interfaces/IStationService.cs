/*
 * File: IStationService.cs
 * Author: IT23218062 - Sanjula Mohotti
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Description: Defines the service operations used to manage
 *              solar microgrid stations.
 */

using Microgrid.Api.DTOs;

namespace Microgrid.Api.Services.Interfaces;

/// Defines business operations for solar microgrid stations.
public interface IStationService
{
    /// Gets all solar stations.
    Task<ServiceResult<List<StationResponse>>> GetAllAsync();

    /// Gets a solar station by its MongoDB identifier.
    /// <param name="id">Station identifier.</param>
    Task<ServiceResult<StationResponse>> GetByIdAsync(string id);

    /// Creates a new solar station.
    /// <param name="request">Station details supplied by the client.</param>
    Task<ServiceResult<StationResponse>> CreateAsync(
        CreateStationRequest request);

    /// Updates an existing solar station.
    /// <param name="id">Station identifier.</param>
    /// <param name="request">Updated station details.</param>
    Task<ServiceResult<StationResponse>> UpdateAsync(
        string id,
        UpdateStationRequest request);

    /// Prevents deactivation when active reservations exist for the station.
    /// when active reservations exist for the station.
    /// <param name="id">Station identifier.</param>
    Task<ServiceResult<StationResponse>> DeactivateAsync(string id);


    /// Reactivates a previously deactivated solar station.
    /// <param name="id">Station identifier.</param>
    Task<ServiceResult<StationResponse>> ActivateAsync(string id);
}