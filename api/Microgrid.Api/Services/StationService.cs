/*
 * File: StationService.cs
 * Author: IT23218062 - Sanjula Mohotti
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Description: Business rules for solar microgrid stations.
 *              Handles station creation, retrieval, updating,
 *              activation and deactivation.
 */

using System.Globalization;
using Microgrid.Api.DTOs;
using Microgrid.Api.Models;
using Microgrid.Api.Services.Interfaces;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Microgrid.Api.Services;

/// Manages solar stations stored in the SolarStationInfo collection.
public class StationService : IStationService
{
    private readonly IMongoCollection<SolarStation> _stations;
    private readonly IReservationService _reservationService;

    /// Creates the service with the MongoDB database and the reservation service supplied
    /// by dependency injection. The reservation service answers whether a station still has active reservations.
    public StationService(IMongoDatabase database, IReservationService reservationService)
    {
        _stations = database.GetCollection<SolarStation>("SolarStationInfo");
        _reservationService = reservationService;
    }

    /// Returns all solar stations, newest first.
    public async Task<ServiceResult<List<StationResponse>>> GetAllAsync()
    {
        var stations = await _stations
            .Find(_ => true)
            .SortByDescending(s => s.CreatedAt)
            .ToListAsync();

        return ServiceResult<List<StationResponse>>.Ok(
            stations.Select(StationResponse.FromStation).ToList());
    }

    /// Returns one solar station by its MongoDB identifier.
    public async Task<ServiceResult<StationResponse>> GetByIdAsync(string id)
    {
        if (!ObjectId.TryParse(id, out _))
        {
            return ServiceResult<StationResponse>.Fail(
                "Invalid station id.", 400);
        }

        var station = await FindStationAsync(id);

        if (station is null)
        {
            return ServiceResult<StationResponse>.Fail(
                "No solar station was found with that id.", 404);
        }

        return ServiceResult<StationResponse>.Ok(
            StationResponse.FromStation(station));
    }

    /// Creates a new solar station.
    public async Task<ServiceResult<StationResponse>> CreateAsync(
        CreateStationRequest request)
    {
        var validationError = ValidateStation(
            request.Name,
            request.Address,
            request.Latitude,
            request.Longitude,
            request.CapacityKwh,
            request.OperatingStartTime,
            request.OperatingEndTime);

        if (validationError is not null)
        {
            return ServiceResult<StationResponse>.Fail(
                validationError, 400);
        }

        var station = new SolarStation
        {
            Name = request.Name.Trim(),
            Address = request.Address.Trim(),
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            CapacityKwh = request.CapacityKwh,
            OperatingStartTime = request.OperatingStartTime.Trim(),
            OperatingEndTime = request.OperatingEndTime.Trim(),
            Status = StationStatus.Active,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _stations.InsertOneAsync(station);

        return ServiceResult<StationResponse>.Ok(
            StationResponse.FromStation(station), 201);
    }

    /// Updates the editable details of an existing solar station.
    public async Task<ServiceResult<StationResponse>> UpdateAsync(
        string id,
        UpdateStationRequest request)
    {
        if (!ObjectId.TryParse(id, out _))
        {
            return ServiceResult<StationResponse>.Fail(
                "Invalid station id.", 400);
        }

        var station = await FindStationAsync(id);

        if (station is null)
        {
            return ServiceResult<StationResponse>.Fail(
                "No solar station was found with that id.", 404);
        }

        var validationError = ValidateStation(
            request.Name,
            request.Address,
            request.Latitude,
            request.Longitude,
            request.CapacityKwh,
            request.OperatingStartTime,
            request.OperatingEndTime);

        if (validationError is not null)
        {
            return ServiceResult<StationResponse>.Fail(
                validationError, 400);
        }

        var update = Builders<SolarStation>.Update
            .Set(s => s.Name, request.Name.Trim())
            .Set(s => s.Address, request.Address.Trim())
            .Set(s => s.Latitude, request.Latitude)
            .Set(s => s.Longitude, request.Longitude)
            .Set(s => s.CapacityKwh, request.CapacityKwh)
            .Set(s => s.OperatingStartTime, request.OperatingStartTime.Trim())
            .Set(s => s.OperatingEndTime, request.OperatingEndTime.Trim())
            .Set(s => s.UpdatedAt, DateTime.UtcNow);

        await _stations.UpdateOneAsync(s => s.Id == id, update);

        var updated = await FindStationAsync(id);

        return ServiceResult<StationResponse>.Ok(
            StationResponse.FromStation(updated!));
    }

    /// Deactivates a solar station.
    /// Prevents deactivation when active reservations exist for the station.
    public async Task<ServiceResult<StationResponse>> DeactivateAsync(string id)
    {
        if (!ObjectId.TryParse(id, out _))
        {
            return ServiceResult<StationResponse>.Fail(
                "Invalid station id.", 400);
        }

        var station = await FindStationAsync(id);

        if (station is null)
        {
            return ServiceResult<StationResponse>.Fail(
                "No solar station was found with that id.", 404);
        }

        if (station.Status == StationStatus.Deactivated)
        {
            return ServiceResult<StationResponse>.Fail(
                "This solar station is already deactivated.", 409);
        }

        // Business rule 7: a station cannot be deactivated while it has active
        // reservations (Pending or Approved bookings that have not ended yet).
        if (await _reservationService.HasActiveReservationsForStationAsync(id))
        {
            return ServiceResult<StationResponse>.Fail(
                "This station has active reservations. Cancel or complete them before deactivating the station.",
                409);
        }

        return await ChangeStatusAsync(
            station,
            StationStatus.Deactivated);
    }

    /// Reactivates a previously deactivated solar station.
    public async Task<ServiceResult<StationResponse>> ActivateAsync(string id)
    {
        if (!ObjectId.TryParse(id, out _))
        {
            return ServiceResult<StationResponse>.Fail(
                "Invalid station id.", 400);
        }

        var station = await FindStationAsync(id);

        if (station is null)
        {
            return ServiceResult<StationResponse>.Fail(
                "No solar station was found with that id.", 404);
        }

        if (station.Status == StationStatus.Active)
        {
            return ServiceResult<StationResponse>.Fail(
                "This solar station is already active.", 409);
        }

        return await ChangeStatusAsync(
            station,
            StationStatus.Active);
    }

    /// Changes the operational status of a solar station.
    private async Task<ServiceResult<StationResponse>> ChangeStatusAsync(
        SolarStation station,
        StationStatus newStatus)
    {
        var updatedAt = DateTime.UtcNow;

        var update = Builders<SolarStation>.Update
            .Set(s => s.Status, newStatus)
            .Set(s => s.UpdatedAt, updatedAt);

        await _stations.UpdateOneAsync(
            s => s.Id == station.Id,
            update);

        station.Status = newStatus;
        station.UpdatedAt = updatedAt;

        return ServiceResult<StationResponse>.Ok(
            StationResponse.FromStation(station));
    }

    /// Finds a station by MongoDB identifier.
    private async Task<SolarStation?> FindStationAsync(string id)
    {
        return await _stations
            .Find(s => s.Id == id)
            .FirstOrDefaultAsync();
    }

    /// Validates station information supplied by the client.
    private static string? ValidateStation(
        string name,
        string address,
        double latitude,
        double longitude,
        double capacityKwh,
        string operatingStartTime,
        string operatingEndTime)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return "Station name is required.";
        }

        if (string.IsNullOrWhiteSpace(address))
        {
            return "Station address is required.";
        }

        if (latitude < -90 || latitude > 90)
        {
            return "Latitude must be between -90 and 90.";
        }

        if (longitude < -180 || longitude > 180)
        {
            return "Longitude must be between -180 and 180.";
        }

        if (capacityKwh <= 0)
        {
            return "Capacity must be greater than 0 kWh.";
        }

        if (!TimeOnly.TryParseExact(
                operatingStartTime,
                "HH:mm",
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out var startTime))
        {
            return "Operating start time must use HH:mm format.";
        }

        if (!TimeOnly.TryParseExact(
                operatingEndTime,
                "HH:mm",
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out var endTime))
        {
            return "Operating end time must use HH:mm format.";
        }

        if (startTime >= endTime)
        {
            return "Operating start time must be earlier than operating end time.";
        }

        return null;
    }
}