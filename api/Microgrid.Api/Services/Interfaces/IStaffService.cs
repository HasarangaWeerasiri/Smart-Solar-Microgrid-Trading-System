/*
 * File: IStaffService.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: Contract for managing staff accounts (Backoffice and Grid Operator). All the
 *              rules for creating, changing, deactivating and reactivating staff live behind
 *              this interface, never in a controller or a client.
 */

using Microgrid.Api.DTOs;

namespace Microgrid.Api.Services.Interfaces;

/// <summary>
/// Staff account management used by the Backoffice user management pages.
/// </summary>
public interface IStaffService
{
    /// <summary>
    /// Lists staff accounts, optionally filtered by role and status.
    /// </summary>
    Task<ServiceResult<List<UserResponse>>> GetAllAsync(string? role, string? status);

    /// <summary>
    /// Returns one staff account, or 404 when the id is unknown or is not a staff account.
    /// </summary>
    Task<ServiceResult<UserResponse>> GetByIdAsync(string id);

    /// <summary>
    /// Creates a Backoffice or Grid Operator account. The email must not already be in use.
    /// </summary>
    Task<ServiceResult<UserResponse>> CreateAsync(CreateStaffRequest request);

    /// <summary>
    /// Updates a staff account. The caller cannot change their own role.
    /// </summary>
    Task<ServiceResult<UserResponse>> UpdateAsync(string id, UpdateStaffRequest request, string currentUserId);

    /// <summary>
    /// Deactivates a staff account so it can no longer log in. The caller cannot
    /// deactivate their own account.
    /// </summary>
    Task<ServiceResult<UserResponse>> DeactivateAsync(string id, string currentUserId);

    /// <summary>
    /// Reactivates a deactivated staff account.
    /// </summary>
    Task<ServiceResult<UserResponse>> ActivateAsync(string id);
}
