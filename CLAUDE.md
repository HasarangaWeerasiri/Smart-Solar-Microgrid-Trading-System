# CLAUDE.md — Smart Solar Microgrid Trading System (SLIIT SE4040, Assignment 1)

Claude Code reads this file automatically at the start of every session.
It holds the project rules and decisions so every team member's agent works the same way.

## 1. Project in one line
Solar prosumers book energy drop-off/charging slots at microgrid hubs (native Android app).
Backoffice admins and Grid Operators manage users, hubs, slots and bookings (web app).
Grid Operators scan the prosumer's QR code on Android to verify and complete a transfer.
Deadline: 30 September 2026, 11:59 PM. Group of 4. Viva after submission.

## 2. Architecture rules (hard requirements — graded)
- FAT service pattern: ALL business logic lives in /api (Services layer). Controllers stay thin.
- /web and /mobile are UI only. They call the API over REST (JSON). No business rules in clients.
- No client may connect to MongoDB directly. No mongodb/mongoose in /web.
- /mobile is PURE NATIVE Android (Kotlin). No Flutter, React Native, Xamarin, MAUI, Ionic, Cordova, Capacitor.
- Android uses raw SQLite (SQLiteOpenHelper) for login/session and reference data. Not Room.
- API is hosted on Windows IIS (ASP.NET Core 10 Hosting Bundle). Deployment uses `dotnet publish -c Release`.

## 3. Stack and layout
| Folder | Tech |
|---|---|
| /api/Microgrid.Api | ASP.NET Core Web API, net10.0, MongoDB.Driver, JWT Bearer, BCrypt.Net-Next, Scalar docs |
| /web | Vite + React + Tailwind CSS (not scaffolded yet) |
| /mobile | Android Studio, Kotlin, SQLite, Google Maps SDK, QR scanning (not scaffolded yet) |
| /docs | api-contract.md, postman collection, diagrams, screenshots, report |

API folders: Controllers/, Models/ (Mongo documents), DTOs/ (request/response), Services/ + Services/Interfaces/ (business rules), Settings/ (typed config).

## 4. MongoDB collections (names are graded — keep them)
- Users — Backoffice, GridOperator and Prosumer accounts (prosumers identified by NIC)
- SolarStationInfo — hubs: name, GPS lat/lng, capacity (kW), battery slot count, schedule, active flag
- EnergyBookingSlots — time slots per station
- EnergyReservation — bookings: prosumer NIC, station, slot, date/time, status

## 5. Business rules (enforce in /api Services ONLY)
1. NIC is the prosumer primary key (unique). Valid formats: 9 digits + V/X (old) or 12 digits (new).
2. Only Backoffice can access admin functions (user management, station registration).
3. A deactivated prosumer can only be reactivated by Backoffice.
4. New prosumer registrations start as Pending and appear in the web app's "pending activations" view.
5. Reservation date must be within 7 days from now.
6. Update or cancel of a reservation requires at least 12 hours' notice.
7. A station cannot be deactivated while it has active reservations.
8. QR code is only available for Approved reservations; operator verify checks it is real, approved, correct station, today.

Roles: `Backoffice`, `GridOperator`, `Prosumer`.
Account status: `Pending`, `Active`, `Deactivated`.
Reservation status: `Pending`, `Approved`, `Completed`, `Cancelled`.

## 6. Code rules (code without these "will not be marked")
Every .cs file starts with this header:
```
/*
 * File: <FileName>.cs
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: <member name>
 * Created: <date>
 * Description: <what this file does>
 */
```
Every method and constructor starts with a `/// <summary>` comment explaining what it does.
Apply the same habit (file header + method comment) in Kotlin and JavaScript files.
Any code taken from a tutorial or external source gets a comment naming the source.

## 7. Dev networking
- API HTTP profile: http://0.0.0.0:5288 (Android emulator reaches it at http://10.0.2.2:5288).
- HTTPS redirect is on only outside Development.
- CORS policy "WebClient" allows origins from config key Cors:AllowedOrigins (default http://localhost:5173).

## 8. Secrets
- Real Mongo URI lives in api/Microgrid.Api/appsettings.Development.json (git-ignored). Template: appsettings.Development.json.example.
- Never print, commit or copy real connection strings, JWT secrets or Google Maps keys.
- Maps key goes in mobile/local.properties (git-ignored). Web env values go in web/.env (git-ignored).

## 9. Git workflow
- `dev` is the integration branch. It always holds the latest working system, so **always start a new branch from `dev`** and merge back into `dev` through Pull Requests.
- `main` holds the final submitted system. Merge `dev` into `main` at integration time and before submission, so the repository link in the report shows the complete project.
- Work on feature branches named feature/<name>, for example feature/user-prosumer-api.
- Do NOT commit or push. The member reviews `git diff` and commits themselves in small, descriptive commits.
- Each member commits their own work from their own GitHub account.

## 10. Current status (updated 23 September 2026)

Shared foundation — done and merged into `dev`. Do not rebuild these:
- API: JWT bearer login with role claims, role policies (BackofficeOnly, GridOperatorOnly, StaffOnly), BCrypt password hashing, a Backoffice user seeded at startup, typed Mongo and JWT settings with fail-fast guards, CORS policy "WebClient", dev-only HTTPS redirect, unique email index.
- Web: Vite + React + Tailwind CSS v4. One API client at `web/src/api/client.js`, auth context with session restore, protected routes, login page with role redirect.
- Mobile: native Kotlin, XML layouts. `SQLiteOpenHelper` session storage, one `ApiClient`, login with role-based home screens. Android 17 needs the ACCESS_LOCAL_NETWORK permission, which LoginActivity requests.
- Docs: `docs/api-contract.md` (the endpoint contract) and `docs/postman-collection.json` (50 requests with assertions).

Member A — auth and accounts:
- Done: login API; staff user API (`/api/users`); prosumer API (`/api/prosumers`) with NIC validation, Pending-on-registration, ownership rules and Backoffice-only activation.
- Not done: web pages for user management, pending activations and prosumer management; Android screens for register, edit profile and request deactivation.

Not started: microgrid nodes and slots, energy reservations, dashboards / QR / maps (other members).

Project level still to do: IIS hosting, sample data in all four collections, README setup steps, individual contributions and video link, the report and its diagrams.

## 11. How to work with the member
- Plain, simple English. Keep technical terms as they are.
- Start with a short honest verdict. Use tables and bullet points.
- Before changing code: list the files you will touch and why. Keep each task small.
- After changing code: build/test, then report files changed, results, and anything not done. Then stop for review.
- After each task, add 3 likely viva questions with short answers about the code just written.
- If a spec detail is unclear, ask instead of guessing.
