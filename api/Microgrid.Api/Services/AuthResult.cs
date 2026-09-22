/*
 * File: AuthResult.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: What the user service hands back after a login attempt. Carries either the
 *              successful response or an error plus the HTTP status the controller should
 *              return, so the controller stays thin and holds no rules of its own.
 */

using Microgrid.Api.DTOs;

namespace Microgrid.Api.Services;

/// <summary>
/// Outcome of a login attempt.
/// </summary>
public class AuthResult
{
    /// <summary>True when the login succeeded.</summary>
    public bool Success { get; private set; }

    /// <summary>Message to show the user when the login failed. Null on success.</summary>
    public string? Error { get; private set; }

    /// <summary>HTTP status the controller should return. 200 on success.</summary>
    public int StatusCode { get; private set; }

    /// <summary>The token and user details. Null when the login failed.</summary>
    public LoginResponse? Response { get; private set; }

    /// <summary>
    /// Builds a successful result carrying the token and user details.
    /// </summary>
    public static AuthResult Ok(LoginResponse response)
    {
        // 200 OK - the client may store the token and continue.
        return new AuthResult { Success = true, StatusCode = 200, Response = response };
    }

    /// <summary>
    /// Builds a failed result. Defaults to 401 for bad credentials; pass 403 when the
    /// credentials were right but the account is not allowed to log in.
    /// </summary>
    public static AuthResult Fail(string error, int statusCode = 401)
    {
        return new AuthResult { Success = false, StatusCode = statusCode, Error = error };
    }
}
