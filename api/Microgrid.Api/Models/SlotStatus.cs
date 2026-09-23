/*
 * File: SlotStatus.cs
 * Author: IT23218062 - Sanjula Mohotti
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Description: Defines the possible states of an energy booking slot.
 */

namespace Microgrid.Api.Models;

/// Current operational state of a energy booking slot.
public enum SlotStatus
{
    Active,
    Deactivated
}