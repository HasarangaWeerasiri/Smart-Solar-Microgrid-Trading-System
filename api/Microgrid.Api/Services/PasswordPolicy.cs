/*
 * File: PasswordPolicy.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: The single rule for what counts as an acceptable password. Kept in one
 *              place so staff accounts and prosumer accounts follow exactly the same rule.
 */

namespace Microgrid.Api.Services;

/// <summary>
/// Password rules shared by every account type.
/// </summary>
public static class PasswordPolicy
{
    /// <summary>Shortest password the system accepts.</summary>
    public const int MinimumLength = 8;

    /// <summary>
    /// Returns an error message when the password is not acceptable, or null when it is.
    /// </summary>
    public static string? Validate(string? password)
    {
        if (string.IsNullOrWhiteSpace(password))
        {
            return "Password is required.";
        }

        if (password.Length < MinimumLength)
        {
            return $"Password must be at least {MinimumLength} characters long.";
        }

        return null;
    }
}
