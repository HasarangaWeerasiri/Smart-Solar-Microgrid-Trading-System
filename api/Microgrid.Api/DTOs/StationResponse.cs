/*
 * File: StationResponse.cs
 * Author: IT23218062 - Sanjula Mohotti
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Description: Solar station information returned to web
 *              and mobile clients.
 */

using Microgrid.Api.Models;

namespace Microgrid.Api.DTOs;


/// Client-facing view of a solar microgrid station.
public class StationResponse
{
    /// MongoDB identifier of the station.
    public string Id { get; set; } = string.Empty;

    /// Name of the solar station.
    public string Name { get; set; } = string.Empty;

    /// Physical address of the station.
    public string Address { get; set; } = string.Empty;

    /// GPS latitude of the station.
    public double Latitude { get; set; }

    /// GPS longitude of the station.
    public double Longitude { get; set; }

    /// Total energy capacity in kWh.
    public double CapacityKwh { get; set; }

    /// Daily operating start time.
    public string OperatingStartTime { get; set; } = string.Empty;

    /// Daily operating end time.
    public string OperatingEndTime { get; set; } = string.Empty;

    /// Active or Deactivated.
    public string Status { get; set; } = string.Empty;

    /// When the station was created, in UTC.
    public DateTime CreatedAt { get; set; }

    /// When the station was last updated, in UTC.
    public DateTime UpdatedAt { get; set; }

    /// Converts a stored SolarStation into a client-facing response.
    public static StationResponse FromStation(SolarStation station)
    {
        return new StationResponse
        {
            Id = station.Id ?? string.Empty,
            Name = station.Name,
            Address = station.Address,
            Latitude = station.Latitude,
            Longitude = station.Longitude,
            CapacityKwh = station.CapacityKwh,
            OperatingStartTime = station.OperatingStartTime,
            OperatingEndTime = station.OperatingEndTime,
            Status = station.Status.ToString(),
            CreatedAt = station.CreatedAt,
            UpdatedAt = station.UpdatedAt
        };
    }
}