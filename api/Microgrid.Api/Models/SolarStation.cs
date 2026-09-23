/*
 * File: SolarStation.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Description: Document stored in the SolarStationInfo collection.
 *              Represents a solar microgrid station with GPS location,
 *              capacity, operating hours and current status.
 */

using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Microgrid.Api.Models;


/// Represents a solar microgrid station.
public class SolarStation
{

    /// Unique MongoDB identifier for the station.
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

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
    /// Example: 08:00
    public string OperatingStartTime { get; set; } = string.Empty;

    /// Daily operating end time.
    /// Example: 18:00
    public string OperatingEndTime { get; set; } = string.Empty;

    /// Current station status.
    [BsonRepresentation(BsonType.String)]
    public StationStatus Status { get; set; } = StationStatus.Active;

    /// Date and time when the station was created.
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// Date and time when the station was last updated.
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}