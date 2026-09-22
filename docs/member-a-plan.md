# Member A Plan — Auth & Accounts

Owner: Lakshan (Member A)
Read CLAUDE.md first. This file covers only Member A's module.

## Scope (end-to-end)
| Layer | Work |
|---|---|
| API | Login + JWT, role-based authorization, web user CRUD (Backoffice/GridOperator), prosumer register / edit / deactivate / activate, pending list |
| Web | Login page (redirect by role), user management page (Backoffice only), pending activations page, prosumer management (reactivate) |
| Android | Login (redirect by role: Prosumer home vs Operator home), register with NIC, edit profile, request deactivation, SQLite session (NIC/email, role, token), logout |

## Marks tied to this module
- Login and role-based access: 4
- User management: 4
- Mobile authentication and account management: 9 (login + role home 2, pending activation view in web 2, create account 3, modify own 1, deactivate own 1)
- SQLite local persistence: 3 (shared integration criterion)

## Suggested API endpoints (confirm and record in docs/api-contract.md)
| Method | Route | Who | Rule |
|---|---|---|---|
| POST | /api/auth/login | Anyone | Staff log in with email, prosumers with NIC. Reject Pending or Deactivated accounts. Returns JWT + role |
| POST | /api/users | Backoffice | Create Backoffice or GridOperator user. Email unique. Password hashed with BCrypt |
| GET | /api/users | Backoffice | List staff users |
| PUT | /api/users/{id} | Backoffice | Update staff user |
| PATCH | /api/users/{id}/deactivate | Backoffice | Deactivate staff user |
| POST | /api/prosumers | Public | Register. NIC valid + unique. Status = Pending |
| GET | /api/prosumers/{nic} | Owner or Backoffice | Profile |
| PUT | /api/prosumers/{nic} | Owner or Backoffice | Edit profile. NIC cannot change |
| PATCH | /api/prosumers/{nic}/deactivate | Owner | Status = Deactivated |
| GET | /api/prosumers?status=Pending | Backoffice | Pending activations list |
| PATCH | /api/prosumers/{nic}/activate | Backoffice | Pending or Deactivated -> Active (only Backoffice can reactivate) |

## Decision to confirm with the team
- Users collection: prosumer documents use NIC as `_id` (spec says NIC is the primary key); staff documents use a generated id. Alternative: one id type for all plus a unique index on `Nic`. Pick one and record it in docs/api-contract.md before coding.

## Batches (one agent task each, commit after each)
| Batch | Branch | Content | Done when |
|---|---|---|---|
| A1 | feature/auth-api | User model, DTOs, IUserService/UserService, BCrypt hashing, JWT generation, AddAuthentication().AddJwtBearer(), UseAuthentication(), role policies, /api/auth/login, seed one Backoffice user | Postman: login returns token; a Backoffice-only endpoint rejects no token (401) and wrong role (403) |
| A2 | feature/user-prosumer-api | Staff user CRUD + all prosumer endpoints + NIC validation + status rules | Postman collection covers every success and failure case |
| A3 | feature/auth-web | Login page, role redirect, protected routes, user management, pending activations, prosumer reactivate (Tailwind) | Backoffice and GridOperator land on different pages; pending prosumer can be activated from the web |
| A4 | feature/auth-android | Login, register, edit profile, deactivate, SQLiteOpenHelper session, role-based home | Kill and reopen the app: still logged in from SQLite; deactivated user cannot log in |

## Failure cases to test (demo + viva favourites)
- Register with an existing NIC -> 409 / clear error
- Register with an invalid NIC -> 400
- Login while Pending or Deactivated -> blocked with a clear message
- GridOperator calls a Backoffice-only endpoint -> 403
- Prosumer tries to edit another prosumer's profile -> 403
- Prosumer tries to reactivate their own account -> blocked (Backoffice only)
