using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Microgrid.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PingController : ControllerBase
{
  private readonly IMongoDatabase _database;

  public PingController(IMongoDatabase database)
  {
    _database = database;
  }

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