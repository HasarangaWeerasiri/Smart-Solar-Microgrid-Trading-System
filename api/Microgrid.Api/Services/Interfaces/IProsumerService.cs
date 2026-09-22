/*
 * File: IProsumerService.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: Contract for managing solar prosumer accounts. Registration, profile edits,
 *              deactivation and activation all sit behind this interface, including the
 *              rule that a prosumer may only touch their own profile.
 */

using Microgrid.Api.DTOs;

namespace Microgrid.Api.Services.Interfaces;

/// <summary>
/// Prosumer account management used by the Android app and the Backoffice web pages.
/// </summary>
public interface IProsumerService
{
    /// <summary>
    /// Registers a new prosumer using their NIC as the account id. A prosumer registering
    /// themselves starts Pending; one created by a Backoffice officer starts Active.
    /// </summary>
    Task<ServiceResult<UserResponse>> RegisterAsync(RegisterProsumerRequest request, bool createdByBackoffice);

    /// <summary>
    /// Lists prosumers, newest first, optionally filtered by status.
    /// Used by the web app's pending activations page with status = Pending.
    /// </summary>
    Task<ServiceResult<List<UserResponse>>> GetAllAsync(string? status);

    /// <summary>
    /// Returns one prosumer profile. A prosumer may only read their own.
    /// </summary>
    Task<ServiceResult<UserResponse>> GetByNicAsync(string nic, string callerId, string callerRole);

    /// <summary>
    /// Updates a prosumer profile. A prosumer may only change their own, and the NIC
    /// itself can never change.
    /// </summary>
    Task<ServiceResult<UserResponse>> UpdateAsync(string nic, UpdateProsumerRequest request, string callerId, string callerRole);

    /// <summary>
    /// Deactivates a prosumer account. The prosumer can request this themselves, and a
    /// Backoffice officer can also do it.
    /// </summary>
    Task<ServiceResult<UserResponse>> DeactivateAsync(string nic, string callerId, string callerRole);

    /// <summary>
    /// Activates a Pending registration or reactivates a Deactivated account.
    /// Only a Backoffice officer may do this.
    /// </summary>
    Task<ServiceResult<UserResponse>> ActivateAsync(string nic);
}
