# Settings

Strongly typed configuration classes bound from `appsettings.json` and injected with
`IOptions<T>`.

Current contents:

- `MongoDbSettings.cs` — MongoDB connection string and database name.

Rules for this folder:

- Plain property bags only, no logic beyond simple "is this configured?" checks.
- Never hard-code a real connection string, password or API key here. Real values go in
  `appsettings.Development.json`, which is git-ignored. See
  `appsettings.Development.json.example` for the expected shape.
