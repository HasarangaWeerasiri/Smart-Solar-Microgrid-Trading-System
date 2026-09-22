/*
 * File: DatabaseSeeder.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: Runs once at startup. Creates a unique index on Email and adds the first
 *              Backoffice user if the Users collection has none, so the team always has
 *              an account to log in with. Existing data is never overwritten.
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
    private readonly IMongoCollection<User> _users;
    private readonly IConfiguration _configuration;
    private readonly ILogger<DatabaseSeeder> _logger;

    /// <summary>
    /// Creates the seeder with the database, configuration and logger supplied by
    /// dependency injection.
    /// </summary>
    public DatabaseSeeder(IMongoDatabase database, IConfiguration configuration, ILogger<DatabaseSeeder> logger)
    {
        _users = database.GetCollection<User>("Users");
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// Runs the whole startup routine: indexes first, then the first Backoffice user.
    /// </summary>
    public async Task SeedAsync()
    {
        await EnsureIndexesAsync();
        await EnsureBackofficeUserAsync();
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
}
