/*
 * File: DatabaseSeeder.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: Runs once at startup. Creates a unique index on Email and adds the first
 *              Backoffice user if the Users collection has none, so the team always has
 *              an account to log in with. Existing data is never overwritten.
 *              Also creates the lookup indexes for the EnergyReservation collection
 *              (reservations part added by Hasaranga, 2026-09-23).
 *              (status_end and reservation_start indexes added by Member D, 2026-09-28, to
 *              support GET /api/reservations' scope and from/to date range filters.)
 *              (Sample data across every collection added by Member D, 2026-09-28: two Grid
 *              Operators, four Prosumers, four stations, twelve slots and fourteen
 *              reservations spread deliberately across every status. Every step checks for an
 *              existing row by a stable natural key first - NIC, email, station name, slot
 *              name, or the prosumer+slot pair for a reservation - and does nothing when that
 *              row is already there, so running the seeder again changes nothing.)
 */

using Microgrid.Api.Models;
using Microgrid.Api.Services.Interfaces;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Microgrid.Api.Services;

/// <summary>
/// Prepares the Users collection when the API starts.
/// </summary>
public class DatabaseSeeder : IDatabaseSeeder
{
    // Passwords for the sample accounts, shared with anyone who needs to log in and try the
    // app out. Not secret - this is sample data for a student project, the same way
    // Prosumer@123 and Operator@123 are already used throughout docs/postman-collection.json.
    private const string SampleStaffPassword = "Operator@123";
    private const string SampleProsumerPassword = "Prosumer@123";

    // Every sample station shares the same operating window, wide enough to hold every
    // sample slot below without any of them falling outside it.
    private const string SampleOperatingStart = "06:00";
    private const string SampleOperatingEnd = "20:00";

    private readonly IMongoCollection<User> _users;
    private readonly IMongoCollection<SolarStation> _stations;
    private readonly IMongoCollection<EnergyBookingSlot> _slots;
    private readonly IMongoCollection<EnergyReservation> _reservations;
    private readonly IConfiguration _configuration;
    private readonly ILogger<DatabaseSeeder> _logger;

    /// <summary>
    /// One row of the fixed station list below: a short key used to wire slots to their
    /// station, plus the details a real Backoffice officer would type in when registering it.
    /// </summary>
    private sealed record StationBlueprint(string Key, string Name, string Address, double Latitude, double Longitude, double CapacityKwh);

    /// <summary>
    /// One row of the fixed slot list below: which station it belongs to, its display name,
    /// and its time as a whole-day offset from today plus an hour range, so "past" and
    /// "future" stay correct no matter what day the seeder actually runs on.
    /// </summary>
    private sealed record SlotBlueprint(string Key, string StationKey, string SlotName, int DayOffset, int StartHour, int EndHour);

    // Four stations spread across different Sri Lankan cities.
    private static readonly StationBlueprint[] SampleStations =
    [
        new("Colombo", "Colombo Microgrid Hub", "Independence Square, Colombo 07", 6.9034, 79.8688, 500),
        new("Kandy", "Kandy Microgrid Hub", "Temple Road, Kandy", 7.2906, 80.6337, 350),
        new("Galle", "Galle Microgrid Hub", "Galle Fort, Galle", 6.0328, 80.2168, 300),
        new("Jaffna", "Jaffna Microgrid Hub", "Hospital Road, Jaffna", 9.6615, 80.0255, 400)
    ];

    // Twelve slots, three per station: one past and two future at Colombo/Galle, two past and
    // one future at Kandy/Jaffna, for six past and six future slots overall - the "mix of past
    // and future" the sample reservations below are built to exercise.
    private static readonly SlotBlueprint[] SampleSlots =
    [
        new("C1", "Colombo", "Colombo Morning Slot (past)", -1, 9, 10),
        new("C2", "Colombo", "Colombo Morning Slot", 1, 10, 11),
        new("C3", "Colombo", "Colombo Afternoon Slot", 3, 15, 16),
        new("K1", "Kandy", "Kandy Morning Slot (past)", -3, 10, 11),
        new("K2", "Kandy", "Kandy Afternoon Slot (past)", -2, 14, 15),
        new("K3", "Kandy", "Kandy Morning Slot", 2, 9, 10),
        new("G1", "Galle", "Galle Morning Slot (past)", -5, 11, 12),
        new("G2", "Galle", "Galle Late Morning Slot", 4, 11, 12),
        new("G3", "Galle", "Galle Evening Slot", 6, 16, 17),
        new("J1", "Jaffna", "Jaffna Morning Slot (past)", -4, 9, 10),
        new("J2", "Jaffna", "Jaffna Afternoon Slot (past)", -2, 13, 14),
        new("J3", "Jaffna", "Jaffna Morning Slot", 5, 10, 11)
    ];

    /// <summary>
    /// Creates the seeder with the database, configuration and logger supplied by
    /// dependency injection.
    /// </summary>
    public DatabaseSeeder(IMongoDatabase database, IConfiguration configuration, ILogger<DatabaseSeeder> logger)
    {
        _users = database.GetCollection<User>("Users");
        _stations = database.GetCollection<SolarStation>("SolarStationInfo");
        _slots = database.GetCollection<EnergyBookingSlot>("EnergyBookingSlots");
        _reservations = database.GetCollection<EnergyReservation>("EnergyReservation");
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// Runs the whole startup routine: indexes first, then the first Backoffice user, then the
    /// sample data used for the report screenshots and the viva demo.
    /// </summary>
    public async Task SeedAsync()
    {
        await EnsureIndexesAsync();
        await EnsureReservationIndexesAsync();
        await EnsureBackofficeUserAsync();

        // Seed:SampleData defaults to true so local/dev startup behaves exactly as before.
        // Production sets it to false, so real hosted data is never mixed with demo accounts.
        if (_configuration.GetValue("Seed:SampleData", true))
        {
            await EnsureSampleDataAsync();
        }
    }

    /// <summary>
    /// Creates the indexes the reservation queries use: a prosumer's own bookings, the
    /// "is this slot already taken" check, the "does this station have active bookings"
    /// check, the dashboard's scope filter (current/history), and the from/to date range and
    /// default sort on GET /api/reservations. Creating an index that already exists does
    /// nothing, so this is safe on every start.
    /// </summary>
    private async Task EnsureReservationIndexesAsync()
    {
        var keys = Builders<EnergyReservation>.IndexKeys;

        await _reservations.Indexes.CreateManyAsync(
        [
            new CreateIndexModel<EnergyReservation>(
                keys.Ascending(r => r.ProsumerNic).Descending(r => r.ReservationStart),
                new CreateIndexOptions { Name = "prosumer_start" }),
            new CreateIndexModel<EnergyReservation>(
                keys.Ascending(r => r.SlotId).Ascending(r => r.Status),
                new CreateIndexOptions { Name = "slot_status" }),
            new CreateIndexModel<EnergyReservation>(
                keys.Ascending(r => r.StationId).Ascending(r => r.Status),
                new CreateIndexOptions { Name = "station_status" }),
            // Supports the scope=current / scope=history filter, which checks the status
            // together with whether the slot's end time has passed.
            new CreateIndexModel<EnergyReservation>(
                keys.Ascending(r => r.Status).Ascending(r => r.ReservationEnd),
                new CreateIndexOptions { Name = "status_end" }),
            // Supports the from/to date range filter and the default "latest first" sort when
            // no other filter narrows the query enough to use one of the indexes above.
            new CreateIndexModel<EnergyReservation>(
                keys.Descending(r => r.ReservationStart),
                new CreateIndexOptions { Name = "reservation_start" })
        ]);
    }

    /// <summary>
    /// Creates a unique index on Email so two staff accounts can never share an address.
    /// A partial filter is used so the many prosumers without an email are skipped.
    /// </summary>
    private async Task EnsureIndexesAsync()
    {
        var indexKeys = Builders<User>.IndexKeys.Ascending(u => u.Email);
        var indexOptions = new CreateIndexOptions<User>
        {
            Name = "uniq_email",
            Unique = true,
            // Only index documents where Email is an actual string, so nulls are ignored.
            PartialFilterExpression = Builders<User>.Filter.Type(u => u.Email, BsonType.String)
        };

        await _users.Indexes.CreateOneAsync(new CreateIndexModel<User>(indexKeys, indexOptions));
    }

    /// <summary>
    /// Adds the first Backoffice user when the collection has none. Without this nobody
    /// could log in to create the other users. Does nothing if one already exists.
    /// </summary>
    private async Task EnsureBackofficeUserAsync()
    {
        var backofficeExists = await _users.Find(u => u.Role == Roles.Backoffice).AnyAsync();
        if (backofficeExists)
        {
            return;
        }

        var email = _configuration["Seed:BackofficeEmail"];
        var password = _configuration["Seed:BackofficePassword"];
        var fullName = _configuration["Seed:BackofficeFullName"] ?? "System Administrator";

        // Without seed details there is nothing to create, so warn instead of failing startup.
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            _logger.LogWarning(
                "No Backoffice user exists and Seed:BackofficeEmail / Seed:BackofficePassword are not set. " +
                "Nobody will be able to log in until one is created.");
            return;
        }

        var admin = new User
        {
            Id = ObjectId.GenerateNewId().ToString(),
            FullName = fullName,
            Email = email.Trim().ToLowerInvariant(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            Role = Roles.Backoffice,
            Status = AccountStatus.Active,
            CreatedAt = DateTime.UtcNow
        };

        await _users.InsertOneAsync(admin);
        _logger.LogInformation("Seeded the first Backoffice user with email {Email}.", admin.Email);
    }

    /// <summary>
    /// Adds the sample staff, prosumers, stations, slots and reservations, in that order,
    /// since each later step needs the ids the earlier ones produce.
    /// </summary>
    private async Task EnsureSampleDataAsync()
    {
        var operatorIds = await EnsureSampleStaffAsync();
        var prosumerNics = await EnsureSampleProsumersAsync();
        var stationIds = await EnsureSampleStationsAsync();
        var slots = await EnsureSampleSlotsAsync(stationIds);
        await EnsureSampleReservationsAsync(prosumerNics, slots, operatorIds);
    }

    /// <summary>
    /// Adds two Grid Operator accounts if they are not already there, matched by email - the
    /// same field the unique staff index already protects. Returns their MongoDB ids, in the
    /// same order every time, for use as ApprovedBy/CompletedBy/CancelledBy below.
    /// </summary>
    private async Task<List<string>> EnsureSampleStaffAsync()
    {
        var operators = new (string Email, string FullName, string Phone)[]
        {
            ("priyantha.silva@microgrid.lk", "Priyantha Silva", "0711234567"),
            ("anusha.wickramasinghe@microgrid.lk", "Anusha Wickramasinghe", "0772345678")
        };

        var ids = new List<string>();

        foreach (var (email, fullName, phone) in operators)
        {
            var existing = await _users.Find(u => u.Email == email).FirstOrDefaultAsync();
            if (existing is not null)
            {
                ids.Add(existing.Id);
                continue;
            }

            var gridOperator = new User
            {
                Id = ObjectId.GenerateNewId().ToString(),
                FullName = fullName,
                Email = email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(SampleStaffPassword),
                Role = Roles.GridOperator,
                Status = AccountStatus.Active,
                Phone = phone,
                CreatedAt = DateTime.UtcNow
            };

            await _users.InsertOneAsync(gridOperator);
            ids.Add(gridOperator.Id);
        }

        return ids;
    }

    /// <summary>
    /// Adds four Prosumer accounts if they are not already there, matched by NIC - a
    /// prosumer's NIC is already their MongoDB _id, so this is the same lookup the API itself
    /// would do. Returns the four NICs, in the same order every time.
    /// </summary>
    private async Task<List<string>> EnsureSampleProsumersAsync()
    {
        var prosumers = new (string Nic, string FullName, string Email, string Phone, string Address)[]
        {
            ("199512345678", "Nimal Perera", "nimal.perera@example.lk", "0711112222", "12 Galle Road, Colombo 03"),
            ("200234567890", "Kumari Jayawardena", "kumari.jayawardena@example.lk", "0772223333", "45 Peradeniya Road, Kandy"),
            ("881234567V", "Sunil Rathnayake", "sunil.rathnayake@example.lk", "0763334444", "8 Lighthouse Street, Galle"),
            ("961234567X", "Chamari Fernando", "chamari.fernando@example.lk", "0754445555", "21 Hospital Road, Jaffna")
        };

        var nics = new List<string>();

        foreach (var (nic, fullName, email, phone, address) in prosumers)
        {
            var normalisedNic = NicValidator.Normalise(nic);
            nics.Add(normalisedNic);

            var existing = await _users.Find(u => u.Id == normalisedNic).FirstOrDefaultAsync();
            if (existing is not null)
            {
                continue;
            }

            var prosumer = new User
            {
                Id = normalisedNic,
                FullName = fullName,
                Email = email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(SampleProsumerPassword),
                Role = Roles.Prosumer,
                Status = AccountStatus.Active,
                Phone = phone,
                Address = address,
                CreatedAt = DateTime.UtcNow
            };

            await _users.InsertOneAsync(prosumer);
        }

        return nics;
    }

    /// <summary>
    /// Adds the four sample stations if they are not already there, matched by name. Returns
    /// each station's MongoDB id keyed by the short key used in <see cref="SampleSlots"/>.
    /// </summary>
    private async Task<Dictionary<string, string>> EnsureSampleStationsAsync()
    {
        var ids = new Dictionary<string, string>();

        foreach (var blueprint in SampleStations)
        {
            var existing = await _stations.Find(s => s.Name == blueprint.Name).FirstOrDefaultAsync();
            if (existing is not null)
            {
                ids[blueprint.Key] = existing.Id!;
                continue;
            }

            var station = new SolarStation
            {
                Name = blueprint.Name,
                Address = blueprint.Address,
                Latitude = blueprint.Latitude,
                Longitude = blueprint.Longitude,
                CapacityKwh = blueprint.CapacityKwh,
                OperatingStartTime = SampleOperatingStart,
                OperatingEndTime = SampleOperatingEnd,
                Status = StationStatus.Active,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _stations.InsertOneAsync(station);
            ids[blueprint.Key] = station.Id!;
        }

        return ids;
    }

    /// <summary>
    /// Adds the twelve sample slots if they are not already there, matched by station and slot
    /// name. Every slot's start and end time are worked out from today's date, so a slot
    /// blueprinted as "past" or "future" stays that way no matter which day the seeder actually
    /// runs on. Returns each slot document keyed by its short key, for use when building the
    /// sample reservations below.
    /// </summary>
    private async Task<Dictionary<string, EnergyBookingSlot>> EnsureSampleSlotsAsync(Dictionary<string, string> stationIds)
    {
        var today = DateTime.UtcNow.Date;
        var slots = new Dictionary<string, EnergyBookingSlot>();

        foreach (var blueprint in SampleSlots)
        {
            var stationId = stationIds[blueprint.StationKey];

            var existing = await _slots
                .Find(s => s.StationId == stationId && s.SlotName == blueprint.SlotName)
                .FirstOrDefaultAsync();

            if (existing is not null)
            {
                slots[blueprint.Key] = existing;
                continue;
            }

            var day = today.AddDays(blueprint.DayOffset);
            var slot = new EnergyBookingSlot
            {
                StationId = stationId,
                SlotName = blueprint.SlotName,
                StartTime = DateTime.SpecifyKind(day.AddHours(blueprint.StartHour), DateTimeKind.Utc),
                EndTime = DateTime.SpecifyKind(day.AddHours(blueprint.EndHour), DateTimeKind.Utc),
                IsAvailable = true,
                Status = SlotStatus.Active,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _slots.InsertOneAsync(slot);
            slots[blueprint.Key] = slot;
        }

        return slots;
    }

    /// <summary>
    /// Adds the fourteen sample reservations: 3 Pending on a future slot, 2 Pending on a slot
    /// that has already ended (the case the dashboard's history view and its "no Approve past
    /// the slot's end time" rule both need to handle), 3 Approved future, 1 Approved past
    /// (approved in time, never completed), 3 Completed (the full Pending -> Approved ->
    /// Completed life cycle), and 2 Cancelled sharing a slot with one of the bookings above -
    /// a Cancelled reservation never counts as "holding" a slot, so this is a realistic
    /// "someone else tried first" story rather than a rule violation.
    /// </summary>
    private async Task EnsureSampleReservationsAsync(
        List<string> prosumerNics, Dictionary<string, EnergyBookingSlot> slots, List<string> operatorIds)
    {
        var now = DateTime.UtcNow;
        var nimal = prosumerNics[0];
        var kumari = prosumerNics[1];
        var sunil = prosumerNics[2];
        var chamari = prosumerNics[3];
        var operator1 = operatorIds[0];
        var operator2 = operatorIds[1];

        // Pending, future slot x3 - waiting for staff to look at them.
        await EnsureSampleReservationAsync(nimal, slots["C2"], ReservationStatus.Pending, createdAt: now.AddHours(-2));
        await EnsureSampleReservationAsync(kumari, slots["K3"], ReservationStatus.Pending, createdAt: now.AddHours(-5));
        await EnsureSampleReservationAsync(sunil, slots["G2"], ReservationStatus.Pending, createdAt: now.AddDays(-1));

        // Pending, past slot x2 - booked while the slot was still open, but nobody approved
        // them before its time ran out.
        await EnsureSampleReservationAsync(chamari, slots["K1"], ReservationStatus.Pending, createdAt: slots["K1"].StartTime.AddDays(-1));
        await EnsureSampleReservationAsync(nimal, slots["J1"], ReservationStatus.Pending, createdAt: slots["J1"].StartTime.AddHours(-20));

        // Approved, future slot x3 - ready for the prosumer to show their QR code.
        await EnsureSampleReservationAsync(
            kumari, slots["C3"], ReservationStatus.Approved,
            createdAt: now.AddDays(-1), approvedBy: operator1, approvedAt: now.AddHours(-3));
        await EnsureSampleReservationAsync(
            sunil, slots["G3"], ReservationStatus.Approved,
            createdAt: now.AddDays(-2), approvedBy: operator2, approvedAt: now.AddDays(-1));
        await EnsureSampleReservationAsync(
            chamari, slots["J3"], ReservationStatus.Approved,
            createdAt: now.AddDays(-1), approvedBy: operator1, approvedAt: now.AddHours(-6));

        // Approved, past slot x1 - approved while it was still in the future, but nobody
        // completed the transfer before its time ran out.
        await EnsureSampleReservationAsync(
            nimal, slots["J2"], ReservationStatus.Approved,
            createdAt: slots["J2"].StartTime.AddDays(-2), approvedBy: operator2, approvedAt: slots["J2"].StartTime.AddDays(-1));

        // Completed x3 - the full life cycle, each one wrapped up shortly after its slot ended.
        await EnsureSampleReservationAsync(
            kumari, slots["C1"], ReservationStatus.Completed,
            createdAt: slots["C1"].StartTime.AddDays(-2), approvedBy: operator1, approvedAt: slots["C1"].StartTime.AddDays(-1),
            completedBy: operator1, completedAt: slots["C1"].EndTime.AddMinutes(10));
        await EnsureSampleReservationAsync(
            sunil, slots["K2"], ReservationStatus.Completed,
            createdAt: slots["K2"].StartTime.AddDays(-3), approvedBy: operator2, approvedAt: slots["K2"].StartTime.AddDays(-2),
            completedBy: operator2, completedAt: slots["K2"].EndTime.AddMinutes(15));
        await EnsureSampleReservationAsync(
            chamari, slots["G1"], ReservationStatus.Completed,
            createdAt: slots["G1"].StartTime.AddDays(-3), approvedBy: operator1, approvedAt: slots["G1"].StartTime.AddDays(-2),
            completedBy: operator1, completedAt: slots["G1"].EndTime.AddMinutes(5));

        // Cancelled x2 - one self-cancelled by the prosumer, one cancelled by staff on the
        // prosumer's behalf. Each shares a slot with an Approved/Pending booking above from a
        // different prosumer: a Cancelled reservation never holds its slot, so two prosumers
        // trying the same slot, one cancelling, is a normal history, not a conflict.
        await EnsureSampleReservationAsync(
            sunil, slots["C3"], ReservationStatus.Cancelled,
            createdAt: now.AddDays(-2), cancelledBy: sunil, cancelledAt: now.AddDays(-2).AddHours(3));
        await EnsureSampleReservationAsync(
            chamari, slots["G2"], ReservationStatus.Cancelled,
            createdAt: now.AddDays(-2), cancelledBy: operator2, cancelledAt: now.AddDays(-2).AddHours(5));
    }

    /// <summary>
    /// Inserts one sample reservation, unless a reservation for this exact prosumer/slot pair
    /// already exists - the natural key for a reservation here, since nothing in the sample
    /// data below books the same slot twice for the same prosumer. Every field is set
    /// explicitly by the caller, so each call site reads as one deliberately chosen row of the
    /// Pending/Approved/Completed/Cancelled spread.
    /// </summary>
    private async Task EnsureSampleReservationAsync(
        string prosumerNic,
        EnergyBookingSlot slot,
        string status,
        DateTime createdAt,
        string? approvedBy = null,
        DateTime? approvedAt = null,
        string? cancelledBy = null,
        DateTime? cancelledAt = null,
        string? completedBy = null,
        DateTime? completedAt = null)
    {
        var existing = await _reservations
            .Find(r => r.ProsumerNic == prosumerNic && r.SlotId == slot.Id)
            .FirstOrDefaultAsync();

        if (existing is not null)
        {
            return;
        }

        var reservation = new EnergyReservation
        {
            ProsumerNic = prosumerNic,
            StationId = slot.StationId,
            SlotId = slot.Id!,
            ReservationStart = slot.StartTime,
            ReservationEnd = slot.EndTime,
            Status = status,
            CreatedAt = createdAt,
            CreatedBy = prosumerNic,
            UpdatedAt = completedAt ?? cancelledAt ?? approvedAt ?? createdAt,
            ApprovedAt = approvedAt,
            ApprovedBy = approvedBy,
            CancelledAt = cancelledAt,
            CancelledBy = cancelledBy,
            CompletedAt = completedAt,
            CompletedBy = completedBy
        };

        await _reservations.InsertOneAsync(reservation);
    }
}
