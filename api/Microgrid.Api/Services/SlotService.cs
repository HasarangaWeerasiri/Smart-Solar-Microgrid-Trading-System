/*
 * File: SlotService.cs
 * Author: IT23218062 - Sanjula Mohotti
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Description: Business rules for energy booking slots.
 *              Handles slot creation, retrieval, updating,
 *              activation and deactivation.
 */

using Microgrid.Api.DTOs;
using Microgrid.Api.Models;
using Microgrid.Api.Services.Interfaces;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Microgrid.Api.Services;

/// Manages energy booking slots stored in the EnergyBookingSlots collection.
public class SlotService : ISlotService
{
    private readonly IMongoCollection<EnergyBookingSlot> _slots;
    private readonly IMongoCollection<SolarStation> _stations;

    /// Creates the service with the MongoDB database supplied by dependency injection.
    public SlotService(IMongoDatabase database)
    {
        _slots = database.GetCollection<EnergyBookingSlot>(
            "EnergyBookingSlots");

        _stations = database.GetCollection<SolarStation>(
            "SolarStationInfo");
    }

    /// Returns all booking slots belonging to one solar station.
    public async Task<ServiceResult<List<SlotResponse>>> GetByStationAsync(
        string stationId)
    {
        if (!ObjectId.TryParse(stationId, out _))
        {
            return ServiceResult<List<SlotResponse>>.Fail(
                "Invalid station id.", 400);
        }

        var station = await FindStationAsync(stationId);

        if (station is null)
        {
            return ServiceResult<List<SlotResponse>>.Fail(
                "No solar station was found with that id.", 404);
        }

        var slots = await _slots
            .Find(s => s.StationId == stationId)
            .SortBy(s => s.StartTime)
            .ToListAsync();

        return ServiceResult<List<SlotResponse>>.Ok(
            slots.Select(SlotResponse.FromSlot).ToList());
    }

    /// Returns one booking slot by its MongoDB identifier.
    public async Task<ServiceResult<SlotResponse>> GetByIdAsync(string id)
    {
        if (!ObjectId.TryParse(id, out _))
        {
            return ServiceResult<SlotResponse>.Fail(
                "Invalid slot id.", 400);
        }

        var slot = await FindSlotAsync(id);

        if (slot is null)
        {
            return ServiceResult<SlotResponse>.Fail(
                "No booking slot was found with that id.", 404);
        }

        return ServiceResult<SlotResponse>.Ok(
            SlotResponse.FromSlot(slot));
    }

    /// Creates a new booking slot under an existing active station.
    public async Task<ServiceResult<SlotResponse>> CreateAsync(
        string stationId,
        CreateSlotRequest request)
    {
        if (!ObjectId.TryParse(stationId, out _))
        {
            return ServiceResult<SlotResponse>.Fail(
                "Invalid station id.", 400);
        }

        var station = await FindStationAsync(stationId);

        if (station is null)
        {
            return ServiceResult<SlotResponse>.Fail(
                "No solar station was found with that id.", 404);
        }

        if (station.Status != StationStatus.Active)
        {
            return ServiceResult<SlotResponse>.Fail(
                "Booking slots cannot be created for a deactivated station.",
                409);
        }

        var validationError = ValidateSlot(
            request.SlotName,
            request.StartTime,
            request.EndTime);

        if (validationError is not null)
        {
            return ServiceResult<SlotResponse>.Fail(
                validationError, 400);
        }

        var slot = new EnergyBookingSlot
        {
            StationId = stationId,
            SlotName = request.SlotName.Trim(),
            StartTime = request.StartTime,
            EndTime = request.EndTime,
            IsAvailable = request.IsAvailable,
            Status = SlotStatus.Active,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _slots.InsertOneAsync(slot);

        return ServiceResult<SlotResponse>.Ok(
            SlotResponse.FromSlot(slot), 201);
    }

    /// Updates an existing energy booking slot.
    public async Task<ServiceResult<SlotResponse>> UpdateAsync(
        string id,
        UpdateSlotRequest request)
    {
        if (!ObjectId.TryParse(id, out _))
        {
            return ServiceResult<SlotResponse>.Fail(
                "Invalid slot id.", 400);
        }

        var slot = await FindSlotAsync(id);

        if (slot is null)
        {
            return ServiceResult<SlotResponse>.Fail(
                "No booking slot was found with that id.", 404);
        }

        var validationError = ValidateSlot(
            request.SlotName,
            request.StartTime,
            request.EndTime);

        if (validationError is not null)
        {
            return ServiceResult<SlotResponse>.Fail(
                validationError, 400);
        }

        var update = Builders<EnergyBookingSlot>.Update
            .Set(s => s.SlotName, request.SlotName.Trim())
            .Set(s => s.StartTime, request.StartTime)
            .Set(s => s.EndTime, request.EndTime)
            .Set(s => s.IsAvailable, request.IsAvailable)
            .Set(s => s.UpdatedAt, DateTime.UtcNow);

        await _slots.UpdateOneAsync(
            s => s.Id == id,
            update);

        var updated = await FindSlotAsync(id);

        return ServiceResult<SlotResponse>.Ok(
            SlotResponse.FromSlot(updated!));
    }


    /// Updates whether an active booking slot is currently available.
    /// This operation is used by Grid Operators.
    public async Task<ServiceResult<SlotResponse>> UpdateAvailabilityAsync(
        string id,
        UpdateSlotAvailabilityRequest request)
    {
        if (!ObjectId.TryParse(id, out _))
        {
            return ServiceResult<SlotResponse>.Fail(
            "Invalid slot id.", 400);
    }

    var slot = await FindSlotAsync(id);

    if (slot is null)
    {
        return ServiceResult<SlotResponse>.Fail(
            "No booking slot was found with that id.", 404);
    }

    if (slot.Status == SlotStatus.Deactivated)
    {
        return ServiceResult<SlotResponse>.Fail(
            "Availability cannot be changed while the slot is deactivated.",
            409);
    }

    var updatedAt = DateTime.UtcNow;

    var update = Builders<EnergyBookingSlot>.Update
        .Set(s => s.IsAvailable, request.IsAvailable)
        .Set(s => s.UpdatedAt, updatedAt);

    await _slots.UpdateOneAsync(
        s => s.Id == slot.Id,
        update);

    slot.IsAvailable = request.IsAvailable;
    slot.UpdatedAt = updatedAt;

    return ServiceResult<SlotResponse>.Ok(
        SlotResponse.FromSlot(slot));
}
    /// Deactivates a booking slot and makes it unavailable.
    public async Task<ServiceResult<SlotResponse>> DeactivateAsync(string id)
    {
        if (!ObjectId.TryParse(id, out _))
        {
            return ServiceResult<SlotResponse>.Fail(
                "Invalid slot id.", 400);
        }

        var slot = await FindSlotAsync(id);

        if (slot is null)
        {
            return ServiceResult<SlotResponse>.Fail(
                "No booking slot was found with that id.", 404);
        }

        if (slot.Status == SlotStatus.Deactivated)
        {
            return ServiceResult<SlotResponse>.Fail(
                "This booking slot is already deactivated.", 409);
        }

        var updatedAt = DateTime.UtcNow;

        var update = Builders<EnergyBookingSlot>.Update
            .Set(s => s.Status, SlotStatus.Deactivated)
            .Set(s => s.IsAvailable, false)
            .Set(s => s.UpdatedAt, updatedAt);

        await _slots.UpdateOneAsync(
            s => s.Id == slot.Id,
            update);

        slot.Status = SlotStatus.Deactivated;
        slot.IsAvailable = false;
        slot.UpdatedAt = updatedAt;

        return ServiceResult<SlotResponse>.Ok(
            SlotResponse.FromSlot(slot));
    }

    /// Reactivates a previously deactivated booking slot.
    /// Availability is not automatically changed.
    public async Task<ServiceResult<SlotResponse>> ActivateAsync(string id)
    {
        if (!ObjectId.TryParse(id, out _))
        {
            return ServiceResult<SlotResponse>.Fail(
                "Invalid slot id.", 400);
        }

        var slot = await FindSlotAsync(id);

        if (slot is null)
        {
            return ServiceResult<SlotResponse>.Fail(
                "No booking slot was found with that id.", 404);
        }

        if (slot.Status == SlotStatus.Active)
        {
            return ServiceResult<SlotResponse>.Fail(
                "This booking slot is already active.", 409);
        }

        var station = await FindStationAsync(slot.StationId);

        if (station is null)
        {
            return ServiceResult<SlotResponse>.Fail(
                "The solar station belonging to this slot no longer exists.",
                409);
        }

        if (station.Status != StationStatus.Active)
        {
            return ServiceResult<SlotResponse>.Fail(
                "A slot cannot be activated while its solar station is deactivated.",
                409);
        }

        var updatedAt = DateTime.UtcNow;

        var update = Builders<EnergyBookingSlot>.Update
            .Set(s => s.Status, SlotStatus.Active)
            .Set(s => s.UpdatedAt, updatedAt);

        await _slots.UpdateOneAsync(
            s => s.Id == slot.Id,
            update);

        slot.Status = SlotStatus.Active;
        slot.UpdatedAt = updatedAt;

        return ServiceResult<SlotResponse>.Ok(
            SlotResponse.FromSlot(slot));
    }

    /// Finds one booking slot by MongoDB identifier.
    private async Task<EnergyBookingSlot?> FindSlotAsync(string id)
    {
        return await _slots
            .Find(s => s.Id == id)
            .FirstOrDefaultAsync();
    }

    /// Finds one solar station by MongoDB identifier.
    private async Task<SolarStation?> FindStationAsync(string id)
    {
        return await _stations
            .Find(s => s.Id == id)
            .FirstOrDefaultAsync();
    }

    /// Validates booking slot information supplied by the client.
    private static string? ValidateSlot(
        string slotName,
        DateTime startTime,
        DateTime endTime)
    {
        if (string.IsNullOrWhiteSpace(slotName))
        {
            return "Slot name is required.";
        }

        if (startTime >= endTime)
        {
            return "Slot start time must be earlier than slot end time.";
        }

        return null;
    }
}