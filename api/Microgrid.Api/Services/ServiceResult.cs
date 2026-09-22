/*
 * File: ServiceResult.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: What a service hands back to a controller. Carries either the data or an
 *              error message, plus the HTTP status to return. The service decides the
 *              status, so controllers only pass the result on and hold no rules of their own.
 */

namespace Microgrid.Api.Services;

/// <summary>
/// Outcome of a service operation that returns data of type <typeparamref name="T"/>.
/// </summary>
public class ServiceResult<T>
{
    /// <summary>True when the operation succeeded.</summary>
    public bool Success { get; private set; }

    /// <summary>HTTP status the controller should return.</summary>
    public int StatusCode { get; private set; }

    /// <summary>Message explaining the failure. Null on success.</summary>
    public string? Error { get; private set; }

    /// <summary>The result data. Default when the operation failed.</summary>
    public T? Data { get; private set; }

    /// <summary>
    /// Builds a successful result. Pass 201 when something new was created.
    /// </summary>
    public static ServiceResult<T> Ok(T data, int statusCode = 200)
    {
        return new ServiceResult<T> { Success = true, StatusCode = statusCode, Data = data };
    }

    /// <summary>
    /// Builds a failed result with the message and HTTP status to send back.
    /// </summary>
    public static ServiceResult<T> Fail(string error, int statusCode)
    {
        return new ServiceResult<T> { Success = false, StatusCode = statusCode, Error = error };
    }
}
