/*
 * File: StationStatus.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Description: Defines the possible states of a solar microgrid station.
 */

namespace Microgrid.Api.Models;

/// Current operational state of a solar station.
public enum StationStatus
{
    Active,
    Deactivated
}