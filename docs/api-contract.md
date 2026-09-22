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

## Still to be added by other modules

Microgrid nodes and slots, energy reservations, dashboards and QR verification. Each module owner
adds their section here in the same format.
