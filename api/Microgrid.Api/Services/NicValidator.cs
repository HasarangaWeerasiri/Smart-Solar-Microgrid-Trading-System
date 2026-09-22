/*
 * File: NicValidator.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: The rule for what counts as a valid Sri Lankan NIC number, kept in one place
 *              because the NIC is the prosumer's primary key. Sri Lanka has two formats:
 *              the old one is 9 digits followed by V or X, and the new one is 12 digits.
 */

using System.Text.RegularExpressions;

namespace Microgrid.Api.Services;

/// <summary>
/// Checks and tidies up NIC numbers before they are used as a prosumer's id.
/// </summary>
public static partial class NicValidator
{
    /// <summary>Old format: 9 digits then the letter V or X, for example 912345678V.</summary>
    [GeneratedRegex(@"^\d{9}[VX]$")]
    private static partial Regex OldFormat();

    /// <summary>New format: exactly 12 digits, for example 200012345678.</summary>
    [GeneratedRegex(@"^\d{12}$")]
    private static partial Regex NewFormat();

    /// <summary>
    /// Removes spaces and makes the letter upper case, so "912345678 v" is stored the same
    /// way as "912345678V" and the same person can never be registered twice.
    /// </summary>
    public static string Normalise(string? nic)
    {
        return (nic ?? string.Empty).Replace(" ", string.Empty).Trim().ToUpperInvariant();
    }

    /// <summary>
    /// Returns an error message when the NIC is not in either accepted format,
    /// or null when it is valid. Expects an already normalised NIC.
    /// </summary>
    public static string? Validate(string nic)
    {
        if (string.IsNullOrWhiteSpace(nic))
        {
            return "NIC is required.";
        }

        if (OldFormat().IsMatch(nic) || NewFormat().IsMatch(nic))
        {
            return null;
        }

        return "NIC must be 9 digits followed by V or X (old format), or 12 digits (new format).";
    }
}
