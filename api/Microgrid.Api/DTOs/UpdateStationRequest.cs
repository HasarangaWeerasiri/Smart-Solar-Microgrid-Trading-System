/*
 * File: UpdateStationRequest.cs
 * Author: IT23218062 - Sanjula Mohotti
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Description: Data received from the client when updating
 *              an existing solar microgrid station.
 */

namespace Microgrid.Api.DTOs;


/// Request data used to update an existing solar station.

public class UpdateStationRequest
{
    /// Name of the solar station.
    public string Name { get; set; } = string.Empty;

    /// Physical address of the station.
    public string Address { get; set; } = string.Empty;

    /// GPS latitude of the station.
    public double Latitude { get; set; }

    /// GPS longitude of the station.
    public double Longitude { get; set; }

    /// Total energy capacity of the station in kWh.
    public double CapacityKwh { get; set; }

    /// Daily operating start time.
    public string OperatingStartTime { get; set; } = string.Empty;

    /// Daily operating end time.
    public string OperatingEndTime { get; set; } = string.Empty;
}