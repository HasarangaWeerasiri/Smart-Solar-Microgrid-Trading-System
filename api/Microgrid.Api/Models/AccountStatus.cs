/*
 * File: AccountStatus.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: The three account states, kept as constants so the same spelling is used
 *              in the database, in the services and in both clients.
 */

namespace Microgrid.Api.Models;

/// <summary>
/// Status values stored on a User document. Controls whether the user may log in.
/// </summary>
public static class AccountStatus
{
    /// <summary>New prosumer registration waiting for Backoffice approval. Cannot log in.</summary>
    public const string Pending = "Pending";

    /// <summary>Approved and usable account. Can log in.</summary>
    public const string Active = "Active";

    /// <summary>Account switched off. Cannot log in. Only Backoffice can reactivate it.</summary>
    public const string Deactivated = "Deactivated";
}
