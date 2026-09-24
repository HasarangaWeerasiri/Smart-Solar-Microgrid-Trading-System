/*
 * File: ReservationService.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: IT23245556 Hasaranga Weerasiri
 * Created: 2026-09-23
 * Description: Business rules for energy slot reservations. Every rule for a booking lives
 *              here and nowhere else (FAT service pattern):
 *                - a reservation must be within 7 days from now, and in the future;
 *                - an update or a cancellation needs at least 12 hours' notice;
 *                - a slot can hold only one active (Pending or Approved) booking;
 *                - the slot and its station must be active, and the prosumer account Active;
 *                - a prosumer can only see and change their own reservations;
 *                - only a Pending reservation can be approved, and a changed one is
 *                  re-approved.
 *              All times are compared in UTC, using the server's clock, never the client's.
 */

using Microgrid.Api.DTOs;
using Microgrid.Api.Models;
using Microgrid.Api.Services.Interfaces;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Microgrid.Api.Services;

/// <summary>
/// Manages reservations stored in the EnergyReservation collection.
/// </summary>
public class ReservationService : IReservationService
{
    /// <summary>Business rule 5: a reservation must be no more than 7 days from now.</summary>
    public static readonly TimeSpan MaxBookingAhead = TimeSpan.FromDays(7);

    /// <summary>Business rule 6: updates and cancellations need at least 12 hours' notice.</summary>
    public static readonly TimeSpan MinChangeNotice = TimeSpan.FromHours(12);

    private readonly IMongoCollection<EnergyReservation> _reservations;
    private readonly IMongoCollection<EnergyBookingSlot> _slots;
    private readonly IMongoCollection<SolarStation> _stations;
    private readonly IMongoCollection<User> _users;

    /// <summary>
    /// Result of checking whether a slot can be booked: the slot when it can, or the error
    /// message and HTTP status when it cannot.
    /// </summary>
    private sealed record SlotCheck(EnergyBookingSlot? Slot, string? Error, int StatusCode);

    /// <summary>
    /// Creates the service with the MongoDB database supplied by dependency injection.
    /// </summary>
    public ReservationService(IMongoDatabase database)
    {
        _reservations = database.GetCollection<EnergyReservation>("EnergyReservation");
        _slots = database.GetCollection<EnergyBookingSlot>("EnergyBookingSlots");
        _stations = database.GetCollection<SolarStation>("SolarStationInfo");
        _users = database.GetCollection<User>("Users");
    }

    /// <summary>
    /// Books a slot for a prosumer. A prosumer can only book for themselves; staff must say
    /// which prosumer the booking is for. The new reservation starts Pending.
    /// </summary>
    public async Task<ServiceResult<ReservationResponse>> CreateAsync(CreateReservationRequest request, string callerId, string callerRole)
    {
        string nic;

        if (callerRole == Roles.Prosumer)
        {
            // The NIC comes from the signed token, so a prosumer cannot book as someone else.
            nic = callerId;
            if (!string.IsNullOrWhiteSpace(request.Nic) && NicValidator.Normalise(request.Nic) != callerId)
            {
                return ServiceResult<ReservationResponse>.Fail("You can only make reservations for yourself.", 403);
            }
        }
        else if (IsStaff(callerRole))
        {
            nic = NicValidator.Normalise(request.Nic);
            var nicError = NicValidator.Validate(nic);
            if (nicError is not null)
            {
                return ServiceResult<ReservationResponse>.Fail(nicError, 400);
            }
        }
        else
        {
            return ServiceResult<ReservationResponse>.Fail("You are not allowed to make reservations.", 403);
        }

        var prosumer = await FindProsumerAsync(nic);
        if (prosumer is null)
        {
            return ServiceResult<ReservationResponse>.Fail("No prosumer was found with that NIC.", 404);
        }

        if (prosumer.Status != AccountStatus.Active)
        {
            return ServiceResult<ReservationResponse>.Fail(
                $"This prosumer account is {prosumer.Status}. Only an Active account can make reservations.", 409);
        }

        var now = DateTime.UtcNow;
        var check = await CheckSlotCanBeBookedAsync(request.SlotId, now, excludeReservationId: null);
        if (check.Error is not null)
        {
            return ServiceResult<ReservationResponse>.Fail(check.Error, check.StatusCode);
        }

        var slot = check.Slot!;
        var reservation = new EnergyReservation
        {
            ProsumerNic = nic,
            StationId = slot.StationId,
            SlotId = slot.Id!,
            ReservationStart = slot.StartTime,
            ReservationEnd = slot.EndTime,
            Status = ReservationStatus.Pending,
            CreatedAt = now,
            CreatedBy = callerId,
            UpdatedAt = now
        };

        await _reservations.InsertOneAsync(reservation);
        return ServiceResult<ReservationResponse>.Ok(await ToResponseAsync(reservation), 201);
    }

    /// <summary>
    /// Lists reservations, latest reservation time first. A prosumer is always limited to
    /// their own bookings, whatever filter they send. Staff can filter by status, NIC and station.
    /// </summary>
    public async Task<ServiceResult<List<ReservationResponse>>> GetAllAsync(string? status, string? nic, string? stationId, string callerId, string callerRole)
    {
        var filter = Builders<EnergyReservation>.Filter.Empty;

        if (callerRole == Roles.Prosumer)
        {
            filter &= Builders<EnergyReservation>.Filter.Eq(r => r.ProsumerNic, callerId);
        }
        else if (!string.IsNullOrWhiteSpace(nic))
        {
            filter &= Builders<EnergyReservation>.Filter.Eq(r => r.ProsumerNic, NicValidator.Normalise(nic));
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!ReservationStatus.All.Contains(status))
            {
                return ServiceResult<List<ReservationResponse>>.Fail(
                    $"Status filter must be one of: {string.Join(", ", ReservationStatus.All)}.", 400);
            }
            filter &= Builders<EnergyReservation>.Filter.Eq(r => r.Status, status);
        }

        if (!string.IsNullOrWhiteSpace(stationId))
        {
            if (!ObjectId.TryParse(stationId, out _))
            {
                return ServiceResult<List<ReservationResponse>>.Fail("Invalid station id.", 400);
            }
            filter &= Builders<EnergyReservation>.Filter.Eq(r => r.StationId, stationId);
        }

        var reservations = await _reservations.Find(filter).SortByDescending(r => r.ReservationStart).ToListAsync();
        return ServiceResult<List<ReservationResponse>>.Ok(await ToResponsesAsync(reservations));
    }

    /// <summary>
    /// Returns one reservation, if the caller is its prosumer or a staff member.
    /// </summary>
    public async Task<ServiceResult<ReservationResponse>> GetByIdAsync(string id, string callerId, string callerRole)
    {
        var (reservation, error) = await FindAccessibleAsync(id, callerId, callerRole, "You can only view your own reservations.");
        if (error is not null)
        {
            return error;
        }

        return ServiceResult<ReservationResponse>.Ok(await ToResponseAsync(reservation!));
    }

    /// <summary>
    /// Moves a reservation to another slot. Checks the 12 hour rule against the current
    /// reservation time and the 7 day rule against the new one. Any earlier approval is
    /// cleared, because staff approved a different slot.
    /// </summary>
    public async Task<ServiceResult<ReservationResponse>> UpdateAsync(string id, UpdateReservationRequest request, string callerId, string callerRole)
    {
        var (reservation, error) = await FindAccessibleAsync(id, callerId, callerRole, "You can only change your own reservations.");
        if (error is not null)
        {
            return error;
        }

        var now = DateTime.UtcNow;
        var ruleError = CheckCanModify(reservation!, now, "changed");
        if (ruleError is not null)
        {
            return ruleError;
        }

        if (request.SlotId == reservation!.SlotId)
        {
            return ServiceResult<ReservationResponse>.Fail("This reservation is already for that slot. Choose a different slot.", 400);
        }

        var check = await CheckSlotCanBeBookedAsync(request.SlotId, now, excludeReservationId: reservation.Id);
        if (check.Error is not null)
        {
            return ServiceResult<ReservationResponse>.Fail(check.Error, check.StatusCode);
        }

        var slot = check.Slot!;
        var update = Builders<EnergyReservation>.Update
            .Set(r => r.SlotId, slot.Id!)
            .Set(r => r.StationId, slot.StationId)
            .Set(r => r.ReservationStart, slot.StartTime)
            .Set(r => r.ReservationEnd, slot.EndTime)
            .Set(r => r.Status, ReservationStatus.Pending)
            .Set(r => r.ApprovedAt, null)
            .Set(r => r.ApprovedBy, null)
            .Set(r => r.UpdatedAt, now);

        return await ApplyChangeAsync(reservation, ReservationStatus.Active, update);
    }

    /// <summary>
    /// Cancels a reservation, which frees its slot for someone else. Needs at least 12 hours'
    /// notice before the reservation time.
    /// </summary>
    public async Task<ServiceResult<ReservationResponse>> CancelAsync(string id, string callerId, string callerRole)
    {
        var (reservation, error) = await FindAccessibleAsync(id, callerId, callerRole, "You can only cancel your own reservations.");
        if (error is not null)
        {
            return error;
        }

        var now = DateTime.UtcNow;
        var ruleError = CheckCanModify(reservation!, now, "cancelled");
        if (ruleError is not null)
        {
            return ruleError;
        }

        var update = Builders<EnergyReservation>.Update
            .Set(r => r.Status, ReservationStatus.Cancelled)
            .Set(r => r.CancelledAt, now)
            .Set(r => r.CancelledBy, callerId)
            .Set(r => r.UpdatedAt, now);

        return await ApplyChangeAsync(reservation!, ReservationStatus.Active, update);
    }

    /// <summary>
    /// Approves a Pending reservation so the prosumer can use it. A reservation whose time has
    /// already started cannot be approved any more.
    /// </summary>
    public async Task<ServiceResult<ReservationResponse>> ApproveAsync(string id, string callerId)
    {
        if (!ObjectId.TryParse(id, out _))
        {
            return ServiceResult<ReservationResponse>.Fail("Invalid reservation id.", 400);
        }

        var reservation = await FindReservationAsync(id);
        if (reservation is null)
        {
            return ServiceResult<ReservationResponse>.Fail("No reservation was found with that id.", 404);
        }

        if (reservation.Status != ReservationStatus.Pending)
        {
            return ServiceResult<ReservationResponse>.Fail(
                $"Only a Pending reservation can be approved. This one is {reservation.Status}.", 409);
        }

        var now = DateTime.UtcNow;
        if (reservation.ReservationStart <= now)
        {
            return ServiceResult<ReservationResponse>.Fail(
                "The reservation time has already passed, so it can no longer be approved.", 409);
        }

        var update = Builders<EnergyReservation>.Update
            .Set(r => r.Status, ReservationStatus.Approved)
            .Set(r => r.ApprovedAt, now)
            .Set(r => r.ApprovedBy, callerId)
            .Set(r => r.UpdatedAt, now);

        return await ApplyChangeAsync(reservation, [ReservationStatus.Pending], update);
    }

    /// <summary>
    /// True when the station has a Pending or Approved reservation that has not ended yet.
    /// Old bookings that were never finished do not count, so they cannot block a station forever.
    /// </summary>
    public async Task<bool> HasActiveReservationsForStationAsync(string stationId)
    {
        var now = DateTime.UtcNow;
        var filter = Builders<EnergyReservation>.Filter.Eq(r => r.StationId, stationId)
                     & Builders<EnergyReservation>.Filter.In(r => r.Status, ReservationStatus.Active)
                     & Builders<EnergyReservation>.Filter.Gt(r => r.ReservationEnd, now);

        return await _reservations.Find(filter).AnyAsync();
    }

    /// <summary>
    /// True when the slot is held by a Pending or Approved reservation that has not ended yet.
    /// A reservation copies its slot's time when booked, so the slot's time must not change
    /// underneath it, and the slot must not be switched off while someone relies on it.
    /// </summary>
    public async Task<bool> HasActiveReservationsForSlotAsync(string slotId)
    {
        var now = DateTime.UtcNow;
        var filter = Builders<EnergyReservation>.Filter.Eq(r => r.SlotId, slotId)
                     & Builders<EnergyReservation>.Filter.In(r => r.Status, ReservationStatus.Active)
                     & Builders<EnergyReservation>.Filter.Gt(r => r.ReservationEnd, now);

        return await _reservations.Find(filter).AnyAsync();
    }

    /// <summary>
    /// Checks every rule a slot must pass before it can be booked: it exists, is active and
    /// available, its station is active, it starts in the future and within 7 days, and no
    /// other active reservation holds it. excludeReservationId skips the booking being moved.
    /// </summary>
    private async Task<SlotCheck> CheckSlotCanBeBookedAsync(string slotId, DateTime now, string? excludeReservationId)
    {
        if (!ObjectId.TryParse(slotId, out _))
        {
            return new SlotCheck(null, "Invalid slot id.", 400);
        }

        var slot = await _slots.Find(s => s.Id == slotId).FirstOrDefaultAsync();
        if (slot is null)
        {
            return new SlotCheck(null, "No booking slot was found with that id.", 404);
        }

        if (slot.Status != SlotStatus.Active || !slot.IsAvailable)
        {
            return new SlotCheck(null, "This slot is not open for booking. Choose another slot.", 409);
        }

        var station = await _stations.Find(s => s.Id == slot.StationId).FirstOrDefaultAsync();
        if (station is null || station.Status != StationStatus.Active)
        {
            return new SlotCheck(null, "The station for this slot is not active, so it cannot take reservations.", 409);
        }

        // Business rule 5: the reservation date must be in the future and within 7 days.
        if (slot.StartTime <= now)
        {
            return new SlotCheck(null, "This slot has already started. Choose a slot in the future.", 400);
        }

        if (slot.StartTime > now.Add(MaxBookingAhead))
        {
            return new SlotCheck(null, "Reservations can only be made up to 7 days in advance.", 400);
        }

        // One slot holds one active booking. Cancelled and Completed bookings do not count.
        var takenFilter = Builders<EnergyReservation>.Filter.Eq(r => r.SlotId, slotId)
                          & Builders<EnergyReservation>.Filter.In(r => r.Status, ReservationStatus.Active);
        if (excludeReservationId is not null)
        {
            takenFilter &= Builders<EnergyReservation>.Filter.Ne(r => r.Id, excludeReservationId);
        }

        if (await _reservations.Find(takenFilter).AnyAsync())
        {
            return new SlotCheck(null, "This slot is already reserved. Choose another slot.", 409);
        }

        return new SlotCheck(slot, null, 200);
    }

    /// <summary>
    /// Business rule 6 plus the status check for update and cancel: the reservation must still
    /// be Pending or Approved, and must start at least 12 hours from now. Returns null when
    /// the change is allowed. action is "changed" or "cancelled", used in the message.
    /// </summary>
    private static ServiceResult<ReservationResponse>? CheckCanModify(EnergyReservation reservation, DateTime now, string action)
    {
        if (!ReservationStatus.Active.Contains(reservation.Status))
        {
            return ServiceResult<ReservationResponse>.Fail(
                $"A {reservation.Status} reservation cannot be {action}.", 409);
        }

        if (!HasEnoughNotice(reservation.ReservationStart, now))
        {
            return ServiceResult<ReservationResponse>.Fail(
                $"A reservation can only be {action} at least 12 hours before its reserved time.", 400);
        }

        return null;
    }

    /// <summary>
    /// True when the reservation starts at least 12 hours after now.
    /// </summary>
    private static bool HasEnoughNotice(DateTime reservationStart, DateTime now)
    {
        return reservationStart - now >= MinChangeNotice;
    }

    /// <summary>
    /// True when the reservation can be updated or cancelled right now. Sent to the clients
    /// as CanModify so they can hide buttons without applying the rule themselves.
    /// </summary>
    private static bool CanModify(EnergyReservation reservation, DateTime now)
    {
        return ReservationStatus.Active.Contains(reservation.Status)
               && HasEnoughNotice(reservation.ReservationStart, now);
    }

    /// <summary>
    /// Writes a change only if the reservation is still in one of the expected statuses.
    /// If someone else changed it in between (for example cancelled it while it was being
    /// approved), nothing is written and a 409 asks the user to reload.
    /// </summary>
    private async Task<ServiceResult<ReservationResponse>> ApplyChangeAsync(
        EnergyReservation reservation,
        string[] expectedStatuses,
        UpdateDefinition<EnergyReservation> update)
    {
        var filter = Builders<EnergyReservation>.Filter.Eq(r => r.Id, reservation.Id)
                     & Builders<EnergyReservation>.Filter.In(r => r.Status, expectedStatuses);

        var result = await _reservations.UpdateOneAsync(filter, update);
        if (result.MatchedCount == 0)
        {
            return ServiceResult<ReservationResponse>.Fail(
                "This reservation was changed by someone else. Reload it and try again.", 409);
        }

        var updated = await FindReservationAsync(reservation.Id!);
        return ServiceResult<ReservationResponse>.Ok(await ToResponseAsync(updated!));
    }

    /// <summary>
    /// Loads a reservation and checks the caller may use it: staff may use any, a prosumer
    /// only their own. Returns either the reservation or the error to send back.
    /// </summary>
    private async Task<(EnergyReservation? Reservation, ServiceResult<ReservationResponse>? Error)> FindAccessibleAsync(
        string id, string callerId, string callerRole, string notYoursMessage)
    {
        if (!ObjectId.TryParse(id, out _))
        {
            return (null, ServiceResult<ReservationResponse>.Fail("Invalid reservation id.", 400));
        }

        var reservation = await FindReservationAsync(id);
        if (reservation is null)
        {
            return (null, ServiceResult<ReservationResponse>.Fail("No reservation was found with that id.", 404));
        }

        var isOwner = callerRole == Roles.Prosumer && reservation.ProsumerNic == callerId;
        if (!IsStaff(callerRole) && !isOwner)
        {
            return (null, ServiceResult<ReservationResponse>.Fail(notYoursMessage, 403));
        }

        return (reservation, null);
    }

    /// <summary>
    /// Finds one reservation by id, or null when there is none.
    /// </summary>
    private async Task<EnergyReservation?> FindReservationAsync(string id)
    {
        return await _reservations.Find(r => r.Id == id).FirstOrDefaultAsync();
    }

    /// <summary>
    /// Finds a prosumer account by NIC. Staff accounts are never returned.
    /// </summary>
    private async Task<User?> FindProsumerAsync(string nic)
    {
        var filter = Builders<User>.Filter.Eq(u => u.Id, nic)
                     & Builders<User>.Filter.Eq(u => u.Role, Roles.Prosumer);
        return await _users.Find(filter).FirstOrDefaultAsync();
    }

    /// <summary>
    /// True for Backoffice and Grid Operator users.
    /// </summary>
    private static bool IsStaff(string role)
    {
        return role == Roles.Backoffice || role == Roles.GridOperator;
    }

    /// <summary>
    /// Builds the response for one reservation, looking up the names it shows.
    /// </summary>
    private async Task<ReservationResponse> ToResponseAsync(EnergyReservation reservation)
    {
        return (await ToResponsesAsync([reservation]))[0];
    }

    /// <summary>
    /// Builds responses for many reservations. The prosumer, station and slot names are read
    /// with one query per collection, not one per reservation, so long lists stay fast.
    /// </summary>
    private async Task<List<ReservationResponse>> ToResponsesAsync(List<EnergyReservation> reservations)
    {
        var nics = reservations.Select(r => r.ProsumerNic).Distinct().ToList();
        var stationIds = reservations.Select(r => r.StationId).Distinct().ToList();
        var slotIds = reservations.Select(r => r.SlotId).Distinct().ToList();

        var prosumerNames = (await _users.Find(Builders<User>.Filter.In(u => u.Id, nics)).ToListAsync())
            .ToDictionary(u => u.Id, u => u.FullName);
        var stationNames = (await _stations.Find(Builders<SolarStation>.Filter.In(s => s.Id, stationIds)).ToListAsync())
            .ToDictionary(s => s.Id!, s => s.Name);
        var slotNames = (await _slots.Find(Builders<EnergyBookingSlot>.Filter.In(s => s.Id, slotIds)).ToListAsync())
            .ToDictionary(s => s.Id!, s => s.SlotName);

        var now = DateTime.UtcNow;
        return reservations.Select(r => ReservationResponse.FromReservation(
            r,
            prosumerNames.GetValueOrDefault(r.ProsumerNic),
            stationNames.GetValueOrDefault(r.StationId),
            slotNames.GetValueOrDefault(r.SlotId),
            CanModify(r, now))).ToList();
    }
}
