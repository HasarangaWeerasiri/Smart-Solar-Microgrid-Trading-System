/*
 * File: Program.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-18
 * Description: Application entry point. Builds the ASP.NET Core host, binds and validates the
 *              MongoDB and JWT settings, registers the Mongo client and the services, sets up
 *              JWT authentication and role policies, configures CORS for the web client, seeds
 *              the database, and wires the HTTP request pipeline.
 */

using System.Text;
using Microgrid.Api.Models;
using Microgrid.Api.Services;
using Microgrid.Api.Services.Interfaces;
using Microgrid.Api.Settings;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Driver;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Read the MongoDB configuration from ConnectionStrings:MongoDB and DatabaseSettings:DatabaseName.
var mongoSettings = new MongoDbSettings
{
    ConnectionString = builder.Configuration.GetConnectionString("MongoDB") ?? string.Empty,
    DatabaseName = builder.Configuration["DatabaseSettings:DatabaseName"] ?? string.Empty
};

// Fail fast at startup rather than letting the first request die with an unclear DI error.
if (mongoSettings.IsConnectionStringMissing())
{
    throw new InvalidOperationException(
        "MongoDB connection string is not configured. " +
        "Copy 'appsettings.Development.json.example' to 'appsettings.Development.json' in " +
        "api/Microgrid.Api and set ConnectionStrings:MongoDB to your own MongoDB URI. " +
        "That file is git-ignored, so your credentials are never committed.");
}

if (mongoSettings.IsDatabaseNameMissing())
{
    throw new InvalidOperationException(
        "DatabaseSettings:DatabaseName is not configured. " +
        "Set it in api/Microgrid.Api/appsettings.json (default: 'SolarMicrogridDB').");
}

// Read the JWT configuration from the Jwt section and check it the same way.
var jwtSettings = new JwtSettings
{
    Issuer = builder.Configuration["Jwt:Issuer"] ?? string.Empty,
    Audience = builder.Configuration["Jwt:Audience"] ?? string.Empty,
    Key = builder.Configuration["Jwt:Key"] ?? string.Empty,
    ExpiryMinutes = builder.Configuration.GetValue("Jwt:ExpiryMinutes", 480)
};

if (jwtSettings.IsKeyMissing())
{
    throw new InvalidOperationException(
        "JWT signing key is not configured, or is shorter than 32 characters. " +
        "Copy 'appsettings.Development.json.example' to 'appsettings.Development.json' in " +
        "api/Microgrid.Api and set Jwt:Key to a long random secret. " +
        "That file is git-ignored, so the key is never committed.");
}

// Make the validated settings injectable as IOptions<T>.
builder.Services.Configure<MongoDbSettings>(settings =>
{
    settings.ConnectionString = mongoSettings.ConnectionString;
    settings.DatabaseName = mongoSettings.DatabaseName;
});

builder.Services.Configure<JwtSettings>(settings =>
{
    settings.Issuer = jwtSettings.Issuer;
    settings.Audience = jwtSettings.Audience;
    settings.Key = jwtSettings.Key;
    settings.ExpiryMinutes = jwtSettings.ExpiryMinutes;
});

// The Mongo client is thread safe and manages its own connection pool, so register it once.
builder.Services.AddSingleton<IMongoClient>(sp =>
{
    var settings = sp.GetRequiredService<IOptions<MongoDbSettings>>().Value;
    return new MongoClient(settings.ConnectionString);
});

// Resolve the single database that all collections live in.
builder.Services.AddSingleton(sp =>
{
    var client = sp.GetRequiredService<IMongoClient>();
    var settings = sp.GetRequiredService<IOptions<MongoDbSettings>>().Value;
    return client.GetDatabase(settings.DatabaseName);
});

// Business logic services. All rules live here, never in a controller or a client.
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IStaffService, StaffService>();
builder.Services.AddScoped<IProsumerService, ProsumerService>();
builder.Services.AddScoped<IDatabaseSeeder, DatabaseSeeder>();

// Microgrid slot files
builder.Services.AddScoped<IStationService, StationService>();
builder.Services.AddScoped<ISlotService, SlotService>();

// Energy reservations: the 7 day and 12 hour rules live in this service.
builder.Services.AddScoped<IReservationService, ReservationService>();


// Check every incoming "Authorization: Bearer <token>" header against our own signing key.
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings.Issuer,
            ValidAudience = jwtSettings.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Key)),
            RoleClaimType = System.Security.Claims.ClaimTypes.Role,
            // No extra grace period once a token expires.
            ClockSkew = TimeSpan.Zero
        };
    });

// Named policies so controllers can say who is allowed in without repeating role strings.
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("BackofficeOnly", policy => policy.RequireRole(Roles.Backoffice));
    options.AddPolicy("GridOperatorOnly", policy => policy.RequireRole(Roles.GridOperator));
    options.AddPolicy("StaffOnly", policy => policy.RequireRole(Roles.Backoffice, Roles.GridOperator));
});

// Allow the React web client, which runs on a different origin, to call this API.
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
if (allowedOrigins is null || allowedOrigins.Length == 0)
{
    allowedOrigins = ["http://localhost:5173"];
}

builder.Services.AddCors(options =>
{
    options.AddPolicy("WebClient", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

// Create the indexes and make sure a Backoffice user exists before serving any request.
using (var scope = app.Services.CreateScope())
{
    var seeder = scope.ServiceProvider.GetRequiredService<IDatabaseSeeder>();
    await seeder.SeedAsync();
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}
else
{
    // Only redirect to HTTPS outside Development. In Development the Android emulator and the
    // web dev server call this API over plain HTTP, and a redirect would break those requests.
    app.UseHttpsRedirection();
}

// CORS must run before authorization so that preflight requests are answered correctly.
app.UseCors("WebClient");

// Authentication works out who the caller is; authorization then decides what they may do.
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
