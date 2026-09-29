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
using System.Globalization;

namespace Microgrid.Api.Services;


/// Manages energy booking slots stored in the EnergyBookingSlots collection.
public class SlotService : ISlotService
{
    private readonly IMongoCollection<EnergyBookingSlot> _slots;
    private readonly IMongoCollection<SolarStation> _stations;
    private readonly IReservationService _reservationService;

    
    /// Creates the service with the MongoDB database and reservation service.
    public SlotService(
        IMongoDatabase database,
        IReservationService reservationService)
    {
        _slots = database.GetCollection<EnergyBookingSlot>(
            "EnergyBookingSlots");

        _stations = database.GetCollection<SolarStation>(
            "SolarStationInfo");

        _reservationService = reservationService;
    }

    /// Returns all booking slots belonging to one solar station.
    public async Task<ServiceResult<List<SlotResponse>>> GetByStationAsync(
        string stationId)
    {
        if (!ObjectId.TryParse(stationId, out _))
        {
            return ServiceResult<List<SlotResponse>>.Fail(
                "Invalid station id.",
                400);
        }

        var station = await FindStationAsync(stationId);

        if (station is null)
        {
            return ServiceResult<List<SlotResponse>>.Fail(
                "No solar station was found with that id.",
                404);
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
                "Invalid slot id.",
                400);
        }

        var slot = await FindSlotAsync(id);

        if (slot is null)
        {
            return ServiceResult<SlotResponse>.Fail(
                "No booking slot was found with that id.",
                404);
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
                "Invalid station id.",
                400);
        }

        var station = await FindStationAsync(stationId);

        if (station is null)
        {
            return ServiceResult<SlotResponse>.Fail(
                "No solar station was found with that id.",
                404);
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
                validationError,
                400);
        }

        // Operating hours are station-local Sri Lanka times.
        var operatingHoursError = ValidateSlotOperatingHours(
            station,
            request.StartTime,
            request.EndTime);

        if (operatingHoursError is not null)
        {
            return ServiceResult<SlotResponse>.Fail(
                operatingHoursError,
                400);
        }

        var hasOverlap = await HasOverlappingSlotAsync(
            stationId,
            request.StartTime,
            request.EndTime);

        if (hasOverlap)
        {
            return ServiceResult<SlotResponse>.Fail(
                "The booking slot overlaps with another active slot at this station.",
                409);
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
            SlotResponse.FromSlot(slot),
            201);
    }

    /// Updates an existing energy booking slot.
    public async Task<ServiceResult<SlotResponse>> UpdateAsync(
        string id,
        UpdateSlotRequest request)
    {
        if (!ObjectId.TryParse(id, out _))
        {
            return ServiceResult<SlotResponse>.Fail(
                "Invalid slot id.",
                400);
        }

        var slot = await FindSlotAsync(id);

        if (slot is null)
        {
            return ServiceResult<SlotResponse>.Fail(
                "No booking slot was found with that id.",
                404);
        }

        var validationError = ValidateSlot(
            request.SlotName,
            request.StartTime,
            request.EndTime);

        if (validationError is not null)
        {
            return ServiceResult<SlotResponse>.Fail(
                validationError,
                400);
        }

        var station = await FindStationAsync(slot.StationId);

        if (station is null)
        {
            return ServiceResult<SlotResponse>.Fail(
                "The solar station belonging to this slot no longer exists.",
                409);
        }

        // Check the requested slot using Sri Lanka station operating hours.
        var operatingHoursError = ValidateSlotOperatingHours(
            station,
            request.StartTime,
            request.EndTime);

        if (operatingHoursError is not null)
        {
            return ServiceResult<SlotResponse>.Fail(
                operatingHoursError,
                400);
        }

        var hasOverlap = await HasOverlappingSlotAsync(
            slot.StationId,
            request.StartTime,
            request.EndTime,
            slot.Id);

        if (hasOverlap)
        {
            return ServiceResult<SlotResponse>.Fail(
                "The booking slot overlaps with another active slot at this station.",
                409);
        }

        // A reservation keeps the slot's original booked time.
        // Therefore, the time of a booked slot cannot be changed.
        var requestedStartUtc = ToUtc(request.StartTime);
        var requestedEndUtc = ToUtc(request.EndTime);
        var existingStartUtc = ToUtc(slot.StartTime);
        var existingEndUtc = ToUtc(slot.EndTime);

        var timeChanged =
            Math.Abs(
                (requestedStartUtc - existingStartUtc)
                .TotalSeconds) >= 1
            ||
            Math.Abs(
                (requestedEndUtc - existingEndUtc)
                .TotalSeconds) >= 1;

        if (timeChanged &&
            await _reservationService
                .HasActiveReservationsForSlotAsync(id))
        {
            return ServiceResult<SlotResponse>.Fail(
                "This slot has an active reservation, so its time cannot be changed. Cancel the reservation first.",
                409);
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
                "Invalid slot id.",
                400);
        }

        var slot = await FindSlotAsync(id);

        if (slot is null)
        {
            return ServiceResult<SlotResponse>.Fail(
                "No booking slot was found with that id.",
                404);
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
    public async Task<ServiceResult<SlotResponse>> DeactivateAsync(
        string id)
    {
        if (!ObjectId.TryParse(id, out _))
        {
            return ServiceResult<SlotResponse>.Fail(
                "Invalid slot id.",
                400);
        }

        var slot = await FindSlotAsync(id);

        if (slot is null)
        {
            return ServiceResult<SlotResponse>.Fail(
                "No booking slot was found with that id.",
                404);
        }

        if (slot.Status == SlotStatus.Deactivated)
        {
            return ServiceResult<SlotResponse>.Fail(
                "This booking slot is already deactivated.",
                409);
        }

        // A slot cannot be switched off while a prosumer
        // still has an active reservation for it.
        if (await _reservationService
            .HasActiveReservationsForSlotAsync(id))
        {
            return ServiceResult<SlotResponse>.Fail(
                "This slot has an active reservation. Cancel the reservation before deactivating the slot.",
                409);
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
    public async Task<ServiceResult<SlotResponse>> ActivateAsync(
        string id)
    {
        if (!ObjectId.TryParse(id, out _))
        {
            return ServiceResult<SlotResponse>.Fail(
                "Invalid slot id.",
                400);
        }

        var slot = await FindSlotAsync(id);

        if (slot is null)
        {
            return ServiceResult<SlotResponse>.Fail(
                "No booking slot was found with that id.",
                404);
        }

        if (slot.Status == SlotStatus.Active)
        {
            return ServiceResult<SlotResponse>.Fail(
                "This booking slot is already active.",
                409);
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

        // Re-check the station operating-hours rule before activation.
        var operatingHoursError = ValidateSlotOperatingHours(
            station,
            slot.StartTime,
            slot.EndTime);

        if (operatingHoursError is not null)
        {
            return ServiceResult<SlotResponse>.Fail(
                operatingHoursError,
                400);
        }

        // A deactivated slot must not become active if another
        // active slot now occupies the same time period.
        var hasOverlap = await HasOverlappingSlotAsync(
            slot.StationId,
            slot.StartTime,
            slot.EndTime,
            slot.Id);

        if (hasOverlap)
        {
            return ServiceResult<SlotResponse>.Fail(
                "This slot cannot be activated because its time overlaps with another active slot at this station.",
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

    /// Validates basic booking slot information supplied by the client.
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

    /// Validates that a booking slot falls within the station's
    /// Sri Lanka local daily operating hours.
    private static string? ValidateSlotOperatingHours(
        SolarStation station,
        DateTime startTime,
        DateTime endTime)
    {
        // Station operating hours are stored as local "HH:mm" values.
        if (!TimeSpan.TryParseExact(
                station.OperatingStartTime,
                @"hh\:mm",
                CultureInfo.InvariantCulture,
                out var operatingStart))
        {
            return "The station operating start time is invalid.";
        }

        if (!TimeSpan.TryParseExact(
                station.OperatingEndTime,
                @"hh\:mm",
                CultureInfo.InvariantCulture,
                out var operatingEnd))
        {
            return "The station operating end time is invalid.";
        }

        // Current system design supports operating periods
        // that start and finish on the same calendar day.
        if (operatingStart >= operatingEnd)
        {
            return "The station operating hours are invalid.";
        }

        /*
         * Slot timestamps represent actual points in time and are stored
         * by MongoDB in UTC. Station operating hours such as 06:00-20:00
         * are Sri Lanka local clock times.
         *
         * Convert the slot timestamps to Sri Lanka time before comparing
         * their TimeOfDay values with the station operating hours.
         */
        var localStart = ToSriLankaTime(startTime);
        var localEnd = ToSriLankaTime(endTime);

        // The slot must start and finish on the same Sri Lanka date.
        if (localStart.Date != localEnd.Date)
        {
            return "A booking slot must start and end on the same date.";
        }

        var slotStart = localStart.TimeOfDay;
        var slotEnd = localEnd.TimeOfDay;

        // The complete slot must be inside the station's operating hours.
        if (slotStart < operatingStart ||
            slotEnd > operatingEnd)
        {
            return $"Booking slot must be within the station operating hours " +
                   $"{station.OperatingStartTime} to " +
                   $"{station.OperatingEndTime}.";
        }

        return null;
    }

    /// Converts an API/MongoDB timestamp to Sri Lanka local time. 
    private static DateTime ToSriLankaTime(DateTime dateTime)
    {
        var utcTime = ToUtc(dateTime);

        return TimeZoneInfo.ConvertTimeFromUtc(
            utcTime,
            GetSriLankaTimeZone());
    }

    /// Normalizes a DateTime value to UTC.
    /// MongoDB timestamps returned without a DateTime kind are treated as UTC.
    private static DateTime ToUtc(DateTime dateTime)
    {
        if (dateTime.Kind == DateTimeKind.Utc)
        {
            return dateTime;
        }

        if (dateTime.Kind == DateTimeKind.Local)
        {
            return dateTime.ToUniversalTime();
        }

        return DateTime.SpecifyKind(
            dateTime,
            DateTimeKind.Utc);
    }

    /// Gets the Sri Lanka time zone.
    /// Asia/Colombo is normally available on Linux/macOS.
    /// Sri Lanka Standard Time is the Windows time-zone identifier.
    private static TimeZoneInfo GetSriLankaTimeZone()
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(
                "Asia/Colombo");
        }
        catch (TimeZoneNotFoundException)
        {
            return TimeZoneInfo.FindSystemTimeZoneById(
                "Sri Lanka Standard Time");
        }
    }

    /// Checks whether the requested time overlaps another active slot
    /// belonging to the same solar station.
    ///
    /// During an update, excludeSlotId prevents the current slot
    /// from conflicting with itself.
    private async Task<bool> HasOverlappingSlotAsync(
        string stationId,
        DateTime startTime,
        DateTime endTime,
        string? excludeSlotId = null)
    {
        var filter = Builders<EnergyBookingSlot>.Filter.And(
            Builders<EnergyBookingSlot>.Filter.Eq(
                s => s.StationId,
                stationId),

            Builders<EnergyBookingSlot>.Filter.Eq(
                s => s.Status,
                SlotStatus.Active),

            Builders<EnergyBookingSlot>.Filter.Lt(
                s => s.StartTime,
                endTime),

            Builders<EnergyBookingSlot>.Filter.Gt(
                s => s.EndTime,
                startTime)
        );

        if (!string.IsNullOrWhiteSpace(excludeSlotId))
        {
            filter = Builders<EnergyBookingSlot>.Filter.And(
                filter,
                Builders<EnergyBookingSlot>.Filter.Ne(
                    s => s.Id,
                    excludeSlotId));
        }

        return await _slots
            .Find(filter)
            .AnyAsync();
    }
}