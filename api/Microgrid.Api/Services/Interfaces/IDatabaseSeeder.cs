/*
 * File: IDatabaseSeeder.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: Contract for the startup routine that prepares the database: creates the
 *              indexes and makes sure one Backoffice user exists to log in with.
 */

namespace Microgrid.Api.Services.Interfaces;

/// <summary>
/// Prepares the database when the API starts.
/// </summary>
public interface IDatabaseSeeder
{
    /// <summary>
    /// Creates the required indexes and adds the first Backoffice user if none exists.
    /// Safe to run on every startup.
    /// </summary>
    Task SeedAsync();
}
