/*
 * File: CreateStationRequest.cs
 * Author: IT23218062 - Sanjula Mohotti
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Description: Data received from the client when creating
 *              a new solar microgrid station.
 */

namespace Microgrid.Api.DTOs;


/// Request data required to create a new solar station.
public class CreateStationRequest
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

    /// Daily operating start time. Example: 08:00.
    public string OperatingStartTime { get; set; } = string.Empty;

    /// Daily operating end time. Example: 18:00.
    public string OperatingEndTime { get; set; } = string.Empty;
}