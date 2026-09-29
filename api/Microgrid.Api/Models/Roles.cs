/*
 * File: Roles.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: The three user roles in the system, kept as constants so the same spelling
 *              is used in the database, in authorization attributes and in both clients.
 */

namespace Microgrid.Api.Models;

/// <summary>
/// Role names stored on a User document and written into the JWT role claim.
/// </summary>
public static class Roles
{
    /// <summary>Backoffice staff. The only role allowed to run admin functions.</summary>
    public const string Backoffice = "Backoffice";

    /// <summary>Grid operator. Uses the web app and the mobile operator mode.</summary>
    public const string GridOperator = "GridOperator";

    /// <summary>Solar prosumer. Uses the mobile app only. Identified by NIC.</summary>
    public const string Prosumer = "Prosumer";
}
