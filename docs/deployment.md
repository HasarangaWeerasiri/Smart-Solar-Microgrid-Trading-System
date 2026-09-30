# Deploying the API to IIS

<!--
File: deployment.md
Project: Smart Solar Microgrid Trading System (SE4040)
Author: Amindu
Created: 2026-09-28
Description: Step-by-step guide to publish and host api/Microgrid.Api on Windows IIS, and to
             repoint the web and mobile clients at the hosted address.
-->

This guide takes a machine that has never seen this project and gets `api/Microgrid.Api`
running under IIS, reachable from the React web app and the Android app. Follow it in order.

## 1. Prerequisites

Install these on the Windows machine that will host the API:

1. **IIS** (Internet Information Services) — Windows Features → turn on
   `Internet Information Services` with `World Wide Web Services` → `Application Development
   Features` → `.NET Extensibility` is not required for ASP.NET Core, but leave IIS's default
   sub-features on.
2. **.NET 10 Hosting Bundle** — download from
   `https://dotnet.microsoft.com/download/dotnet/10.0` (the "Hosting Bundle" installer, not just
   the SDK or the runtime). This installs the ASP.NET Core Module (ANCM) into IIS and the
   shared runtime the app needs. **Run `iisreset` after installing it** so IIS picks up the
   module.
3. **MongoDB reachable from this machine** — either a local MongoDB service, or network access
   to the Atlas cluster the team uses. Confirm with `mongosh "<your connection string>"` before
   continuing; if that fails, IIS hosting will fail the same way.
4. The **.NET 10 SDK** on whichever machine runs `dotnet publish` (does not have to be the IIS
   server itself — you can publish elsewhere and copy the output over).

Verify the hosting bundle installed correctly:

```powershell
dotnet --info
# Look for "Microsoft.AspNetCore.App" under "Runtimes" — net10.0 must be listed.
```

## 2. Publish the API

From the repository root:

```powershell
cd api/Microgrid.Api
dotnet publish -c Release -p:PublishProfile=IISProfile
```

This uses [`Properties/PublishProfiles/IISProfile.pubxml`](../api/Microgrid.Api/Properties/PublishProfiles/IISProfile.pubxml)
and produces a deployable folder at:

```
api/Microgrid.Api/bin/Release/net10.0/publish/
```

That folder contains `Microgrid.Api.dll`, the committed [`web.config`](../api/Microgrid.Api/web.config),
`appsettings.json`, and every dependency. It does **not** contain `appsettings.Production.json` —
that file is git-ignored (same as `appsettings.Development.json`) because it holds real
credentials. Copy your own `appsettings.Production.json` into the publish folder manually
(see step 3) before the site can start.

Copy the whole `publish` folder to the IIS server (e.g. `C:\inetpub\microgrid-api`).

## 3. Production settings

[`appsettings.Production.example.json`](../api/Microgrid.Api/appsettings.Production.example.json)
is committed and lists every key ASP.NET Core's Production environment reads. Copy it to
`appsettings.Production.json` **inside the publish folder on the server** and fill in real
values:

| Key | What to put there |
| --- | --- |
| `ConnectionStrings:MongoDB` | The real MongoDB URI (Atlas or a reachable local instance) |
| `Jwt:Key` | A long random secret, at least 32 characters, different from the dev one |
| `Cors:AllowedOrigins` | The web app's real origin — see step 6 |
| `Seed:SampleData` | `false` in production, so the demo accounts from `DatabaseSeeder` are never created on real data |

`ASPNETCORE_ENVIRONMENT=Production` is already set inside [`web.config`](../api/Microgrid.Api/web.config),
which is what makes ASP.NET Core load `appsettings.Production.json` over `appsettings.json`.
Never commit the filled-in `appsettings.Production.json` — `.gitignore` already excludes it the
same way it excludes `appsettings.Development.json`.

## 4. Create the IIS site

1. Open **IIS Manager** → right-click **Sites** → **Add Website**.
2. **Site name**: `MicrogridApi` (or anything descriptive).
3. **Physical path**: the publish folder you copied over, e.g. `C:\inetpub\microgrid-api`.
4. **Binding**: pick a port that is free — this project uses `http`, port `8080` (kept
   deliberately different from the `dotnet run` dev port, `5288`, so both can be told apart at
   a glance) — or `80` if this machine is dedicated to the API.
5. Click OK. IIS creates a new Application Pool with the same name as the site.

### Set the Application Pool to "No Managed Code"

1. In IIS Manager → **Application Pools** → select the pool IIS just created (e.g. `MicrogridApi`).
2. **Basic Settings** → set **.NET CLR version** to **No Managed Code**.

**Why this matters:** "No Managed Code" tells IIS not to load the classic .NET Framework CLR
into the worker process. ASP.NET Core is not a classic ASP.NET (System.Web) application — it
runs its own self-contained runtime, started by the ASP.NET Core Module (ANCM) that the
Hosting Bundle installed. If the pool tries to also load the Framework CLR, it either fails to
start or wastes memory loading a runtime the app never uses. Every ASP.NET Core app on IIS
uses "No Managed Code" for this reason.

## 5. Folder permissions for the app pool identity

The app pool's identity (by default `IIS AppPool\MicrogridApi`) needs **Read & Execute** on the
publish folder, and **Modify** on the `logs` subfolder if you turn on stdout logging (step 8).

```powershell
$poolName = "MicrogridApi"
$sitePath = "C:\inetpub\microgrid-api"

icacls $sitePath /grant ("IIS AppPool\$poolName" + ":(OI)(CI)RX")
New-Item -ItemType Directory -Force "$sitePath\logs" | Out-Null
icacls "$sitePath\logs" /grant ("IIS AppPool\$poolName" + ":(OI)(CI)M")
```

Without this, the site returns **HTTP 500.19** or the worker process fails to start, because
the app pool identity cannot read `Microgrid.Api.dll` or write its logs.

## 6. Firewall rule

Open the port you bound the site to (step 4) so other machines on the network — the web app's
users, the Android phone — can reach it:

```powershell
New-NetFirewallRule -DisplayName "Microgrid API (IIS)" -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow
```

Replace `8080` with whatever port you actually chose.

## 7. Repoint the clients

### Web app (`web/.env`)

Copy `web/.env.example` to `web/.env` if you have not already, then set:

```
VITE_API_BASE_URL=http://<iis-server-address>:8080
```

`web/src/api/client.js` reads `VITE_API_BASE_URL` (falling back to `http://localhost:5288`,
the `dotnet run` address, only if the variable is unset). Rebuild/restart the Vite dev server
(or rebuild for production) so the new value is picked up.

### CORS — add the web app's real origin

The API's `Cors:AllowedOrigins` (in `appsettings.Production.json` on the server, see step 3)
must include the **origin the browser actually sends**, scheme + host + port, no trailing
slash — for example, to allow a web app running on `http://localhost:5173`:

```json
"Cors": {
  "AllowedOrigins": [ "http://localhost:5173" ]
}
```

If this list does not include the web app's real origin, the browser blocks every API call
with a CORS error even though a plain `curl`/Postman request works fine — CORS is enforced by
the browser, not the server. Restart the site (or `iisreset`) after changing this file.

### Android app

The Android app reads the API address from `BuildConfig.API_BASE_URL`
(`app/src/main/java/lk/sliit/microgrid/data/remote/ApiClient.kt`), which Gradle fills in at
build time from `app/build.gradle.kts`. The default there is the Android emulator's alias for
the IIS-hosted API, `http://10.0.2.2:8080`. Nothing in the Kotlin source needs editing to
repoint the app.

To point at a different host (a physical device, or a different IIS server), add a line to
the git-ignored `mobile/local.properties`:

```properties
API_BASE_URL=http://<iis-server-address>:8080
```

then also add that host to `app/src/main/res/xml/network_security_config.xml` (Android blocks
plain HTTP to hosts that are not explicitly allow-listed there), and re-sync/rebuild
(`./gradlew assembleDebug`) so the new `BuildConfig.API_BASE_URL` takes effect. See
`mobile/README.md` for the current physical-device address used on this team's network and a
note on why phone-hotspot addresses don't stay fixed.

## 8. Verify

1. **Health check** — from any machine on the network:
   ```powershell
   curl http://<iis-server-address>:8080/api/ping
   ```
   Expect `{"status":"connected","mongoResponse":"..."}`. `"status":"failed"` means the API
   started but cannot reach MongoDB — recheck `ConnectionStrings:MongoDB` in
   `appsettings.Production.json`.
2. **Log in** — from the web app, sign in as the seeded Backoffice user
   (`Seed:BackofficeEmail` / `Seed:BackofficePassword`, set in `appsettings.Production.json`
   the same way as dev). A successful login with a role redirect confirms JWT issuing and CORS
   both work end to end.
3. **Both clients** — load the web app pointed at the hosted address (step 7) and confirm the
   dashboard loads; open the Android app pointed at the same address and confirm login works
   there too.

## 9. Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| **HTTP 500.19** — "The requested page cannot be accessed because the related configuration data for the page is invalid" | Usually the ASP.NET Core Module isn't installed, or `web.config` is malformed/missing from the publish folder. Reinstall the .NET Hosting Bundle and run `iisreset`; confirm `web.config` exists next to `Microgrid.Api.dll`. |
| **HTTP 502.5 – ANCM Out-Of-Process Startup Failure** (or the in-process equivalent, a blank 502) | The app process failed to start. Usually a missing/wrong .NET runtime version on the server (check `dotnet --info` lists `net10.0`), or the app pool is **not** set to "No Managed Code" (step 4). Turn on `stdoutLogEnabled` in `web.config` (see the comment there), reproduce, and read the newest file in the site's `logs` folder for the real exception. |
| **HTTP 500.30 – ASP.NET Core app failed to start** | The app started under ANCM but crashed during startup — almost always the fail-fast checks in `Program.cs` throwing, because `ConnectionStrings:MongoDB` or `Jwt:Key` is missing or invalid in `appsettings.Production.json` (step 3). Check `Cors:AllowedOrigins` and `DatabaseSettings:DatabaseName` are present too. Turn on stdout logging (same as above) to see the exact `InvalidOperationException` message. |
| Browser calls fail with a CORS error, but the same request works in Postman | `Cors:AllowedOrigins` in `appsettings.Production.json` does not list the web app's exact origin (scheme + host + port). See step 7. |
| Android app can't reach the API at all (connection refused / timed out) | Either the firewall rule (step 6) is missing, `local.properties`' `API_BASE_URL` still points at the emulator default or a stale/changed hotspot IP (step 7), or the host is missing from `network_security_config.xml`. |
| Site starts but every request 500s with a Mongo-related error in the logs | `ConnectionStrings:MongoDB` is reachable from your dev machine but not from the IIS server (firewall, IP allow-list on Atlas, or a local MongoDB service that isn't running on the server). Test with `mongosh` directly on the IIS server. |
