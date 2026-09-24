# API Contract — Smart Solar Microgrid Trading System

The agreement between the C# Web API and its two clients (React web app, Android app).
Both clients call **only** these endpoints. All business rules live in the API.

Base URL in development: `http://localhost:5288` (Android emulator: `http://10.0.2.2:5288`).
Interactive docs while the API runs in Development: `http://localhost:5288/scalar/v1`.
Every endpoint is exercised in `docs/postman-collection.json`.

---

## Conventions

| Topic | Rule |
| --- | --- |
| Format | JSON in and out. Property names are camelCase (`fullName`, `userId`). |
| Authentication | `Authorization: Bearer <token>`, using the token from `POST /api/auth/login`. |
| Errors | Always `{ "error": "message" }`, except input-validation failures, which use ASP.NET's standard `{ "errors": { "Field": ["message"] } }` shape. Both clients already read both shapes. |
| Passwords | Minimum 8 characters. Stored only as BCrypt hashes. Never returned by any endpoint. |
| Emails | Stored lower case. Unique across all accounts. |

### Status codes

| Code | Meaning in this API |
| --- | --- |
| 200 | Success |
| 201 | Created something new |
| 400 | The input breaks a rule (bad format, weak password, not allowed for yourself) |
| 401 | No token, or wrong login details |
| 403 | Logged in, but not allowed (wrong role, not your account, or account Pending / Deactivated at login) |
| 404 | No such record |
| 409 | Conflicts with existing data (duplicate NIC or email, or already in that status) |

---

## Roles and statuses

| Roles | `Backoffice`, `GridOperator`, `Prosumer` |
| --- | --- |
| Account status | `Pending`, `Active`, `Deactivated` |

Only `Active` accounts can log in.

---

## Design decision: NIC is the prosumer's `_id`

The spec says the NIC is the prosumer's primary key. So a prosumer's MongoDB `_id` **is** their NIC,
and MongoDB's own guarantee that `_id` is unique means a NIC can never be registered twice — the
database enforces the rule, not just application code. Staff accounts use a generated id instead.

Consequences for clients:

- `userId` in every response **is** the NIC for a prosumer. `nic` is also returned for clarity (null for staff).
- A NIC can never be changed after registration.
- Prosumers log in with their NIC; staff log in with their email. Both use the same `identifier` field.

---

## Account object (`UserResponse`)

Returned by every account endpoint:

```json
{
  "userId": "200012345678",
  "nic": "200012345678",
  "fullName": "Nimal Perera",
  "email": "nimal@example.lk",
  "role": "Prosumer",
  "status": "Active",
  "phone": "0771234567",
  "address": "12 Temple Road, Kandy",
  "createdAt": "2026-09-22T10:15:00Z"
}
```

---

## Auth — `/api/auth` (done, batch A1)

| Method | Route | Who | Description |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | Anyone | Body `{ "identifier", "password" }`. Returns `token`, `expiresAtUtc`, and the user's details. 401 for wrong details, 403 for Pending or Deactivated. |
| GET | `/api/auth/me` | Any logged-in user | The caller's own account. |

---

## Staff users — `/api/users` (done, batch A2a)

Backoffice only. A Grid Operator or Prosumer token gets 403.

| Method | Route | Description | Errors |
| --- | --- | --- | --- |
| GET | `/api/users?role=&status=` | List staff, newest first. Both filters optional. | 400 unknown filter value |
| GET | `/api/users/{id}` | One staff account. | 404 (also for a prosumer's id) |
| POST | `/api/users` | Create a Backoffice or GridOperator account. Starts `Active`. Returns 201. | 400, 409 email in use |
| PUT | `/api/users/{id}` | Update name, email, role, phone. `newPassword` optional. | 400, 404, 409 email in use |
| PATCH | `/api/users/{id}/deactivate` | Account can no longer log in. | 400 your own account, 404, 409 already deactivated |
| PATCH | `/api/users/{id}/activate` | Reactivate a deactivated account. | 404, 409 already active |

Request bodies:

```json
// POST /api/users
{ "fullName": "Kamal Silva", "email": "kamal@microgrid.lk", "password": "Operator@123", "role": "GridOperator", "phone": "0771234567" }

// PUT /api/users/{id}  (newPassword optional)
{ "fullName": "Kamal Silva", "email": "kamal@microgrid.lk", "role": "GridOperator", "phone": "0771234567", "newPassword": "" }
```

Safety rules:

- A Backoffice officer **cannot deactivate their own account** and **cannot change their own role**, so the last administrator can never lock everyone out.
- Staff endpoints only accept the roles `Backoffice` and `GridOperator`.

---

## Prosumers — `/api/prosumers` (done, batch A2b)

| Method | Route | Who | Description | Errors |
| --- | --- | --- | --- | --- |
| POST | `/api/prosumers` | Anyone | Register with NIC. Self-registration starts `Pending`; created by Backoffice starts `Active`. Returns 201. | 400 bad NIC or weak password, 409 NIC or email already used |
| GET | `/api/prosumers?status=` | Backoffice | List prosumers, newest first. `?status=Pending` feeds the pending activations page. | 400 unknown status |
| GET | `/api/prosumers/{nic}` | That prosumer, or Backoffice | View a profile. | 403 someone else's, 404 |
| PUT | `/api/prosumers/{nic}` | That prosumer, or Backoffice | Edit a profile. | 400, 403, 404, 409 email in use |
| PATCH | `/api/prosumers/{nic}/deactivate` | That prosumer, or Backoffice | Deactivate. | 403, 404, 409 already deactivated |
| PATCH | `/api/prosumers/{nic}/activate` | **Backoffice only** | Approve a Pending account or reactivate a Deactivated one. | 403, 404, 409 already active |

Request bodies:

```json
// POST /api/prosumers   (email, phone and address are optional)
{ "nic": "200012345678", "fullName": "Sunil Fernando", "password": "Prosumer@123",
  "email": "sunil@example.lk", "phone": "0712223333", "address": "5 Lake Road, Kandy" }

// PUT /api/prosumers/{nic}   (no nic field: the NIC can never change. newPassword optional)
{ "fullName": "Sunil Fernando", "email": "sunil@example.lk", "phone": "0719998888",
  "address": "7 Hill Street", "newPassword": "" }
```

**NIC formats accepted:** 9 digits followed by `V` or `X` (old format), or 12 digits (new format).
Spaces are removed and the letter is upper-cased before storing, so `912345678 v` and `912345678V`
are treated as the same person and cannot both be registered.

Rules worth knowing:

- **Registration is open** (no token) — a new prosumer has no account yet. If a Backoffice token *is*
  sent, the account is created `Active` instead of `Pending`.
- A prosumer may only read, edit or deactivate **their own** profile. Backoffice may do any.
- **Only Backoffice can activate**, which covers both approving a new registration and
  reactivating a deactivated account.
- Prosumer endpoints never return or change staff accounts, and staff endpoints never touch prosumers.

---

## Energy reservations — `/api/reservations` (Member C)

Collection: `EnergyReservation`. One reservation books one slot (`EnergyBookingSlots`) at one station
(`SolarStationInfo`) for one prosumer (`Users`, by NIC). The reservation date/time is the slot's start time.

| Method | Route | Who | Description | Errors |
| --- | --- | --- | --- | --- |
| POST | `/api/reservations` | Prosumer (for themselves) or staff (for a prosumer's NIC) | Book a slot. Starts `Pending`. Returns 201. | 400 7-day rule / past slot / bad id / missing NIC, 403 booking for someone else, 404 unknown slot or NIC, 409 slot taken / slot or station not open / prosumer not Active |
| GET | `/api/reservations?status=&nic=&stationId=` | Any logged-in user | List, latest reservation time first. **A prosumer always gets only their own**, whatever filters they send. | 400 unknown status or bad station id |
| GET | `/api/reservations/{id}` | Owner or staff | One reservation. | 400, 403 someone else's, 404 |
| PUT | `/api/reservations/{id}` | Owner or staff | Move to another slot. Goes back to `Pending` and the approval is cleared. | 400 12-hour rule / 7-day rule / same slot, 403, 404, 409 not Pending/Approved or new slot taken |
| PATCH | `/api/reservations/{id}/cancel` | Owner or staff | Cancel. The slot becomes free again. | 400 12-hour rule, 403, 404, 409 not Pending/Approved |
| PATCH | `/api/reservations/{id}/approve` | **Backoffice or Grid Operator** | `Pending` → `Approved`. | 403, 404, 409 not Pending or time already passed |

Request bodies:

```json
// POST /api/reservations   (nic only when staff book for a prosumer)
{ "slotId": "66f1c0a2e4b0a1b2c3d4e5f6", "nic": "200012345678" }

// PUT /api/reservations/{id}
{ "slotId": "66f1c0a2e4b0a1b2c3d4e5f7" }
```

Response (`ReservationResponse`):

```json
{
  "id": "66f1c3b9e4b0a1b2c3d4e600",
  "prosumerNic": "200012345678", "prosumerName": "Sunil Fernando",
  "stationId": "66f1c0a2e4b0a1b2c3d4e5f0", "stationName": "Kandy Hub",
  "slotId": "66f1c0a2e4b0a1b2c3d4e5f6", "slotName": "Morning 08:00",
  "reservationStart": "2026-09-25T02:30:00Z", "reservationEnd": "2026-09-25T03:30:00Z",
  "status": "Pending",
  "canModify": true,
  "createdAt": "2026-09-23T10:00:00Z", "createdBy": "200012345678",
  "updatedAt": "2026-09-23T10:00:00Z",
  "approvedAt": null, "approvedBy": null,
  "cancelledAt": null, "cancelledBy": null,
  "completedAt": null, "completedBy": null
}
```

Rules (all enforced in `ReservationService`, never in a client):

- **7-day rule:** the slot must start in the future and no more than 7 days from now. Checked on create and on the new slot of an update.
- **12-hour rule:** update and cancel need the current reservation time to be at least 12 hours away. It applies to staff too.
- **One active booking per slot:** a `Pending` or `Approved` reservation holds its slot. `Cancelled` frees it.
- The slot must be `Active` and `isAvailable`, its station `Active`, and the prosumer account `Active`.
- **A booked slot is protected:** while a slot holds an active reservation, `PUT /api/slots/{id}` cannot change its
  start or end time, and `PATCH /api/slots/{id}/deactivate` is refused (both 409). Renaming it or changing its
  availability is still allowed. Likewise a station with active reservations cannot be deactivated (409, rule 7).
- **`canModify`** is worked out by the API (Pending/Approved and at least 12 hours away). Clients use it to show or hide the Edit and Cancel buttons instead of doing the time maths themselves.
- All times are UTC (`Z`). Clients convert to local time for display.
- Status life cycle: `Pending` → `Approved` → `Completed` (set by the QR verify step), or `Pending`/`Approved` → `Cancelled`.

---

## Still to be added by other modules

Microgrid nodes and slots, dashboards and QR verification. Each module owner adds their section
here in the same format.
