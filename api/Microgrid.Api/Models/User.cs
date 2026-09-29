/*
 * File: User.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: Document stored in the Users collection. Holds Backoffice, GridOperator and
 *              Prosumer accounts. For a prosumer the _id IS the NIC, which is how the spec's
 *              "NIC is the primary key" rule is enforced by the database itself.
 */

using MongoDB.Bson.Serialization.Attributes;

namespace Microgrid.Api.Models;

/// <summary>
/// A single account in the Users collection.
/// </summary>
public class User
{
    /// <summary>
    /// Primary key. For a prosumer this is the NIC. For staff it is a generated id.
    /// MongoDB guarantees _id is unique, so a NIC can never be registered twice.
    /// </summary>
    [BsonId]
    public string Id { get; set; } = string.Empty;

    /// <summary>Full name of the person.</summary>
    public string FullName { get; set; } = string.Empty;

    /// <summary>
    /// Email address. Staff log in with this. Null for a prosumer who did not give one.
    /// </summary>
    public string? Email { get; set; }

    /// <summary>Password hashed with BCrypt. The plain password is never stored.</summary>
    public string PasswordHash { get; set; } = string.Empty;

    /// <summary>One of the values in <see cref="Roles"/>.</summary>
    public string Role { get; set; } = string.Empty;

    /// <summary>One of the values in <see cref="AccountStatus"/>.</summary>
    public string Status { get; set; } = AccountStatus.Pending;

    /// <summary>Contact phone number. Optional.</summary>
    public string? Phone { get; set; }

    /// <summary>Postal address of the property. Optional.</summary>
    public string? Address { get; set; }

    /// <summary>When the account was created, in UTC.</summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Returns the NIC for a prosumer, or null for staff. The NIC is stored as the _id,
    /// so this simply reads that back under a clearer name.
    /// </summary>
    [BsonIgnore]
    public string? Nic => Role == Roles.Prosumer ? Id : null;
}
