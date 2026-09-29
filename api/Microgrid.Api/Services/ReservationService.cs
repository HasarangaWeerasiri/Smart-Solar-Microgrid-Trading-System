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
 *              (Dashboard summary, complete, and QR issue/verify added by Member D, 2026-09-28:
 *              rule 8 - a QR code is only available for an Approved reservation, and verifying
 *              one never changes its status; that is what marks it Completed. GetAllAsync
 *              extended the same day with date range, scope, search and paging - every filter,
 *              the search and the paging run as MongoDB queries, never in memory.)
 */

using System.Buffers.Text;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Microgrid.Api.DTOs;
using Microgrid.Api.Models;
using Microgrid.Api.Services.Interfaces;
using Microgrid.Api.Settings;
using Microsoft.Extensions.Options;
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

    /// <summary>Business rule 8: how long a QR token stays valid after being issued.</summary>
    public static readonly TimeSpan QrTokenLifetime = TimeSpan.FromHours(24);

    private readonly IMongoCollection<EnergyReservation> _reservations;
    private readonly IMongoCollection<EnergyBookingSlot> _slots;
    private readonly IMongoCollection<SolarStation> _stations;
    private readonly IMongoCollection<User> _users;
    private readonly JwtSettings _jwtSettings;

    /// <summary>
    /// Result of checking whether a slot can be booked: the slot when it can, or the error
    /// message and HTTP status when it cannot.
    /// </summary>
    private sealed record SlotCheck(EnergyBookingSlot? Slot, string? Error, int StatusCode);

    /// <summary>
    /// Result of parsing a QR token: whether its shape is valid, whether its signature checks
    /// out, and the fields it carries when it can be read at all.
    /// </summary>
    private sealed record QrTokenParseResult(
        bool IsWellFormed, bool HasValidSignature, string? ReservationId, string? ProsumerNic, DateTime ExpiresAtUtc);

    /// <summary>
    /// Creates the service with the MongoDB database and the JWT settings supplied by
    /// dependency injection. QR tokens are signed with the same key as login tokens, read the
    /// same way TokenService reads it, so no second secret has to be configured.
    /// </summary>
    public ReservationService(IMongoDatabase database, IOptions<JwtSettings> jwtOptions)
    {
        _reservations = database.GetCollection<EnergyReservation>("EnergyReservation");
        _slots = database.GetCollection<EnergyBookingSlot>("EnergyBookingSlots");
        _stations = database.GetCollection<SolarStation>("SolarStationInfo");
        _users = database.GetCollection<User>("Users");
        _jwtSettings = jwtOptions.Value;
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
    /// Lists reservations, latest reservation time first, paged. A prosumer is always limited
    /// to their own bookings, whatever filter they send. Staff can filter by status, NIC,
    /// station, a from/to date range on the slot start time, a scope ("current" | "history" |
    /// "all") and a free-text search across the prosumer's NIC, the prosumer's name and the
    /// station's name. Every filter, the search and the paging run as MongoDB queries; the
    /// full reservation list is never loaded into memory to filter it here.
    /// </summary>
    public async Task<ServiceResult<ReservationListResult>> GetAllAsync(
        string? status, string? nic, string? stationId, string? from, string? to,
        string? scope, string? search, int page, int pageSize, string callerId, string callerRole)
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
                return ServiceResult<ReservationListResult>.Fail(
                    $"Status filter must be one of: {string.Join(", ", ReservationStatus.All)}.", 400);
            }
            filter &= Builders<EnergyReservation>.Filter.Eq(r => r.Status, status);
        }

        if (!string.IsNullOrWhiteSpace(stationId))
        {
            if (!ObjectId.TryParse(stationId, out _))
            {
                return ServiceResult<ReservationListResult>.Fail("Invalid station id.", 400);
            }
            filter &= Builders<EnergyReservation>.Filter.Eq(r => r.StationId, stationId);
        }

        if (!string.IsNullOrWhiteSpace(from))
        {
            if (!TryParseIsoDate(from, out var fromUtc))
            {
                return ServiceResult<ReservationListResult>.Fail(
                    "Invalid 'from' date. Use ISO 8601, for example 2026-09-01T00:00:00Z.", 400);
            }
            filter &= Builders<EnergyReservation>.Filter.Gte(r => r.ReservationStart, fromUtc);
        }

        if (!string.IsNullOrWhiteSpace(to))
        {
            if (!TryParseIsoDate(to, out var toUtc))
            {
                return ServiceResult<ReservationListResult>.Fail(
                    "Invalid 'to' date. Use ISO 8601, for example 2026-09-07T23:59:59Z.", 400);
            }
            filter &= Builders<EnergyReservation>.Filter.Lte(r => r.ReservationStart, toUtc);
        }

        if (!string.IsNullOrWhiteSpace(scope) && scope != ReservationScopes.All)
        {
            var now = DateTime.UtcNow;
            if (scope == ReservationScopes.Current)
            {
                // Still holds its slot (Pending or Approved) and that slot has not ended yet.
                filter &= Builders<EnergyReservation>.Filter.In(r => r.Status, ReservationStatus.Active)
                          & Builders<EnergyReservation>.Filter.Gt(r => r.ReservationEnd, now);
            }
            else if (scope == ReservationScopes.History)
            {
                // Finished either way: staff resolved it, or its time simply ran out.
                filter &= Builders<EnergyReservation>.Filter.In(r => r.Status, [ReservationStatus.Completed, ReservationStatus.Cancelled])
                          | Builders<EnergyReservation>.Filter.Lte(r => r.ReservationEnd, now);
            }
            else
            {
                return ServiceResult<ReservationListResult>.Fail(
                    $"Scope filter must be one of: {string.Join(", ", ReservationScopes.AllValues)}.", 400);
            }
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            filter &= await BuildSearchFilterAsync(search.Trim());
        }

        var effectivePage = page < 1 ? 1 : page;
        var effectivePageSize = pageSize switch
        {
            < 1 => 50,
            > 200 => 200,
            _ => pageSize
        };

        var pageTask = _reservations.Find(filter)
            .SortByDescending(r => r.ReservationStart)
            .Skip((effectivePage - 1) * effectivePageSize)
            .Limit(effectivePageSize)
            .ToListAsync();
        var countTask = _reservations.CountDocumentsAsync(filter);

        await Task.WhenAll(pageTask, countTask);

        return ServiceResult<ReservationListResult>.Ok(new ReservationListResult(
            await ToResponsesAsync(pageTask.Result), countTask.Result, effectivePage, effectivePageSize));
    }

    /// <summary>
    /// Builds the search filter: a reservation matches when its own prosumer NIC contains the
    /// search text, or its prosumer's name does, or its station's name does. The two name
    /// lookups are small, targeted queries against Users and SolarStationInfo (never the full
    /// reservation list) so the match still happens in MongoDB. The search text is escaped
    /// before being used as a regular expression, so a user typing "." or "*" searches for
    /// that literal text instead of it being read as a wildcard.
    /// </summary>
    private async Task<FilterDefinition<EnergyReservation>> BuildSearchFilterAsync(string search)
    {
        var regex = new BsonRegularExpression(Regex.Escape(search), "i");

        // Kicked off together, then awaited one at a time: SolarStation.Id carries a
        // [BsonRepresentation(BsonType.ObjectId)] serializer, so projecting it through a
        // "?? string.Empty" default (to get a single Task<List<string>> for Task.WhenAll)
        // makes the driver try to serialize "" as an ObjectId while translating the query and
        // throw a FormatException, even though no real document ever has a null id. Awaiting
        // the two tasks separately keeps them running concurrently without that constant ever
        // needing to be translated.
        var matchingNicsTask = _users.Find(
                Builders<User>.Filter.Eq(u => u.Role, Roles.Prosumer)
                & Builders<User>.Filter.Regex(u => u.FullName, regex))
            .Project(u => u.Id)
            .ToListAsync();

        var matchingStationIdsTask = _stations.Find(Builders<SolarStation>.Filter.Regex(s => s.Name, regex))
            .Project(s => s.Id)
            .ToListAsync();

        var matchingNics = await matchingNicsTask;
        var matchingStationIds = await matchingStationIdsTask;

        return Builders<EnergyReservation>.Filter.Regex(r => r.ProsumerNic, regex)
               | Builders<EnergyReservation>.Filter.In(r => r.ProsumerNic, matchingNics)
               | Builders<EnergyReservation>.Filter.In(r => r.StationId, matchingStationIds.OfType<string>());
    }

    /// <summary>
    /// Parses an ISO 8601 date string as UTC. Used for the from/to filters on GetAllAsync.
    /// </summary>
    private static bool TryParseIsoDate(string value, out DateTime utc)
    {
        return DateTime.TryParse(
            value,
            CultureInfo.InvariantCulture,
            DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal,
            out utc);
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
    /// Counts reservations by status. A prosumer only ever gets counts for their own NIC,
    /// forced server-side the same way GetAllAsync forces it; staff get system-wide counts.
    /// Every count is a MongoDB CountDocuments query, so no reservation list is ever loaded
    /// into memory just to add its rows up.
    /// </summary>
    public async Task<ServiceResult<ReservationSummaryResponse>> GetSummaryAsync(string callerId, string callerRole)
    {
        var scope = Builders<EnergyReservation>.Filter.Empty;
        if (callerRole == Roles.Prosumer)
        {
            scope = Builders<EnergyReservation>.Filter.Eq(r => r.ProsumerNic, callerId);
        }

        var now = DateTime.UtcNow;
        var statusFilters = Builders<EnergyReservation>.Filter;

        var pendingTask = _reservations.CountDocumentsAsync(scope & statusFilters.Eq(r => r.Status, ReservationStatus.Pending));
        var approvedTask = _reservations.CountDocumentsAsync(scope & statusFilters.Eq(r => r.Status, ReservationStatus.Approved));
        var completedTask = _reservations.CountDocumentsAsync(scope & statusFilters.Eq(r => r.Status, ReservationStatus.Completed));
        var cancelledTask = _reservations.CountDocumentsAsync(scope & statusFilters.Eq(r => r.Status, ReservationStatus.Cancelled));
        var approvedUpcomingTask = _reservations.CountDocumentsAsync(
            scope
            & statusFilters.Eq(r => r.Status, ReservationStatus.Approved)
            & statusFilters.Gt(r => r.ReservationStart, now));

        await Task.WhenAll(pendingTask, approvedTask, completedTask, cancelledTask, approvedUpcomingTask);

        return ServiceResult<ReservationSummaryResponse>.Ok(new ReservationSummaryResponse
        {
            Pending = (int)pendingTask.Result,
            Approved = (int)approvedTask.Result,
            Completed = (int)completedTask.Result,
            Cancelled = (int)cancelledTask.Result,
            ApprovedUpcoming = (int)approvedUpcomingTask.Result
        });
    }

    /// <summary>
    /// Marks an Approved reservation Completed, after staff verify its QR code and finish the
    /// energy transfer. Only an Approved reservation may move to Completed.
    /// </summary>
    public async Task<ServiceResult<ReservationResponse>> CompleteAsync(string id, string callerId)
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

        if (reservation.Status != ReservationStatus.Approved)
        {
            return ServiceResult<ReservationResponse>.Fail(
                $"Only an Approved reservation can be completed. This one is {reservation.Status}.", 409);
        }

        var now = DateTime.UtcNow;
        var update = Builders<EnergyReservation>.Update
            .Set(r => r.Status, ReservationStatus.Completed)
            .Set(r => r.CompletedAt, now)
            .Set(r => r.CompletedBy, callerId)
            .Set(r => r.UpdatedAt, now);

        return await ApplyChangeAsync(reservation, [ReservationStatus.Approved], update);
    }

    /// <summary>
    /// Issues a signed QR token for an Approved reservation. The token is stateless: it is
    /// never stored, so verifying it later needs no extra collection, only the same secret
    /// it was signed with.
    /// </summary>
    public async Task<ServiceResult<ReservationQrResponse>> GetQrAsync(string id, string callerId, string callerRole)
    {
        var (reservation, error) = await FindAccessibleAsync(id, callerId, callerRole, "You can only view the QR code for your own reservations.");
        if (error is not null)
        {
            return ServiceResult<ReservationQrResponse>.Fail(error.Error!, error.StatusCode);
        }

        if (reservation!.Status != ReservationStatus.Approved)
        {
            return ServiceResult<ReservationQrResponse>.Fail(
                $"A QR code is only available for an Approved reservation. This one is {reservation.Status}.", 409);
        }

        var issuedAtUtc = DateTime.UtcNow;
        var expiresAtUtc = issuedAtUtc.Add(QrTokenLifetime);
        var token = BuildQrToken(reservation.Id!, reservation.ProsumerNic, issuedAtUtc, expiresAtUtc);

        return ServiceResult<ReservationQrResponse>.Ok(new ReservationQrResponse
        {
            Token = token,
            ReservationId = reservation.Id!,
            ExpiresAt = expiresAtUtc
        });
    }

    /// <summary>
    /// Verifies a token scanned from a prosumer's QR code and returns the booking it belongs
    /// to. Read-only: this never changes the reservation's status, so a Grid Operator can
    /// re-scan freely before confirming the transfer with CompleteAsync.
    /// </summary>
    public async Task<ServiceResult<VerifyQrResponse>> VerifyQrAsync(VerifyQrRequest request)
    {
        var parsed = ParseQrToken(request.Token);
        if (!parsed.IsWellFormed)
        {
            return ServiceResult<VerifyQrResponse>.Fail("The QR code is not a valid token.", 400);
        }

        if (!parsed.HasValidSignature)
        {
            return ServiceResult<VerifyQrResponse>.Fail(
                "The QR code's signature does not match. It may have been altered.", 401);
        }

        if (DateTime.UtcNow > parsed.ExpiresAtUtc)
        {
            return ServiceResult<VerifyQrResponse>.Fail(
                "This QR code has expired. Ask the prosumer to open their booking again.", 410);
        }

        var reservation = await FindReservationAsync(parsed.ReservationId!);
        if (reservation is null || reservation.ProsumerNic != parsed.ProsumerNic)
        {
            return ServiceResult<VerifyQrResponse>.Fail("No reservation was found for this QR code.", 404);
        }

        if (reservation.Status != ReservationStatus.Approved)
        {
            return ServiceResult<VerifyQrResponse>.Fail(
                $"This reservation is not ready for a transfer. Its current status is {reservation.Status}.", 409);
        }

        var responses = await ToResponsesAsync([reservation]);
        var response = responses[0];

        return ServiceResult<VerifyQrResponse>.Ok(new VerifyQrResponse
        {
            ReservationId = reservation.Id!,
            ProsumerNic = reservation.ProsumerNic,
            ProsumerFullName = response.ProsumerName,
            StationName = response.StationName,
            SlotName = response.SlotName,
            StartTime = reservation.ReservationStart,
            EndTime = reservation.ReservationEnd,
            Status = reservation.Status
        });
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

    /// <summary>
    /// Builds a signed QR token for a reservation. The payload is
    /// "reservationId|prosumerNic|issuedAtUnix|expiresAtUnix"; the signature is an
    /// HMAC-SHA256 of that payload using the JWT signing key, so a token can be verified
    /// later without storing it anywhere. Base64Url (System.Buffers.Text) keeps the token
    /// safe to put straight into a URL or a QR code, with no '+', '/' or '=' characters.
    /// </summary>
    private string BuildQrToken(string reservationId, string prosumerNic, DateTime issuedAtUtc, DateTime expiresAtUtc)
    {
        var payload = $"{reservationId}|{prosumerNic}|{ToUnixSeconds(issuedAtUtc)}|{ToUnixSeconds(expiresAtUtc)}";
        var payloadBytes = Encoding.UTF8.GetBytes(payload);
        var signatureBytes = SignPayload(payloadBytes);

        return $"{Base64Url.EncodeToString(payloadBytes)}.{Base64Url.EncodeToString(signatureBytes)}";
    }

    /// <summary>
    /// Parses and validates a QR token. Never throws: a token that is the wrong shape, is not
    /// valid Base64Url, or does not split into exactly the four expected fields comes back
    /// with IsWellFormed = false; a well-formed token whose signature does not match comes
    /// back with HasValidSignature = false. The signature is compared in constant time
    /// (CryptographicOperations.FixedTimeEquals) so a mismatch cannot be timed by an attacker.
    /// </summary>
    private QrTokenParseResult ParseQrToken(string? token)
    {
        var malformed = new QrTokenParseResult(false, false, null, null, DateTime.MinValue);

        if (string.IsNullOrWhiteSpace(token))
        {
            return malformed;
        }

        var parts = token.Split('.');
        if (parts.Length != 2)
        {
            return malformed;
        }

        byte[] payloadBytes;
        byte[] signatureBytes;
        try
        {
            payloadBytes = Base64Url.DecodeFromChars(parts[0]);
            signatureBytes = Base64Url.DecodeFromChars(parts[1]);
        }
        catch (FormatException)
        {
            return malformed;
        }

        var fields = Encoding.UTF8.GetString(payloadBytes).Split('|');
        if (fields.Length != 4
            || !long.TryParse(fields[2], out _)
            || !long.TryParse(fields[3], out var expiresAtUnix)
            || !ObjectId.TryParse(fields[0], out _)
            || string.IsNullOrWhiteSpace(fields[1]))
        {
            return malformed;
        }

        var expectedSignature = SignPayload(payloadBytes);
        var hasValidSignature = CryptographicOperations.FixedTimeEquals(signatureBytes, expectedSignature);

        return new QrTokenParseResult(true, hasValidSignature, fields[0], fields[1], FromUnixSeconds(expiresAtUnix));
    }

    /// <summary>
    /// Computes the HMAC-SHA256 signature of a QR token payload, using the same JWT signing
    /// key TokenService uses to sign login tokens, read from configuration the same way.
    /// </summary>
    private byte[] SignPayload(byte[] payloadBytes)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_jwtSettings.Key));
        return hmac.ComputeHash(payloadBytes);
    }

    /// <summary>Converts a UTC time to whole seconds since the Unix epoch, for the token payload.</summary>
    private static long ToUnixSeconds(DateTime utc) => new DateTimeOffset(utc, TimeSpan.Zero).ToUnixTimeSeconds();

    /// <summary>Converts whole seconds since the Unix epoch back to a UTC time.</summary>
    private static DateTime FromUnixSeconds(long unixSeconds) => DateTimeOffset.FromUnixTimeSeconds(unixSeconds).UtcDateTime;
}
