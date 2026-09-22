/*
 * File: PingController.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-18
 * Description: Health-check endpoint used to confirm that the API is running and that the
 *              MongoDB connection configured in appsettings is reachable.
 */

using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Microgrid.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PingController : ControllerBase
{
  private readonly IMongoDatabase _database;

  /// <summary>
  /// Creates the controller with the MongoDB database resolved by dependency injection.
  /// </summary>
  public PingController(IMongoDatabase database)
  {
    _database = database;
  }

  /// <summary>
  /// Sends a ping command to MongoDB and reports whether the database answered.
  /// Returns 200 with the server response, or 500 with the error message on failure.
  /// </summary>
  [HttpGet]
  public async Task<IActionResult> Get()
  {
    try
    {
      var result = await _database.RunCommandAsync<BsonDocument>(new BsonDocument("ping", 1));
      return Ok(new { status = "connected", mongoResponse = result.ToString() });
    }
    catch (Exception ex)
    {
      return StatusCode(500, new { status = "failed", error = ex.Message });
    }
  }
}
