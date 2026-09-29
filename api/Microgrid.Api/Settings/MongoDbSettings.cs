/*
 * File: MongoDbSettings.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: Strongly typed holder for the MongoDB connection details read from
 *              configuration (ConnectionStrings:MongoDB and DatabaseSettings:DatabaseName).
 *              Injected into services through IOptions<MongoDbSettings>.
 */

namespace Microgrid.Api.Settings;

/// <summary>
/// Configuration values needed to open a connection to the MongoDB server.
/// </summary>
public class MongoDbSettings
{
    /// <summary>
    /// Connection string for the MongoDB server. Supplied by ConnectionStrings:MongoDB.
    /// The real value is kept in appsettings.Development.json, which is not committed.
    /// </summary>
    public string ConnectionString { get; set; } = string.Empty;

    /// <summary>
    /// Name of the database that holds the project collections.
    /// Supplied by DatabaseSettings:DatabaseName.
    /// </summary>
    public string DatabaseName { get; set; } = string.Empty;

    /// <summary>
    /// Returns true when the connection string is still empty or left as the placeholder
    /// text shipped in appsettings.json, meaning no real value has been configured yet.
    /// </summary>
    public bool IsConnectionStringMissing()
    {
        // Treat blank values and the "<set in ...>" placeholder as "not configured".
        return string.IsNullOrWhiteSpace(ConnectionString)
               || ConnectionString.StartsWith('<');
    }

    /// <summary>
    /// Returns true when no database name has been configured.
    /// </summary>
    public bool IsDatabaseNameMissing()
    {
        // A blank database name would make MongoClient.GetDatabase throw at first use.
        return string.IsNullOrWhiteSpace(DatabaseName);
    }
}
