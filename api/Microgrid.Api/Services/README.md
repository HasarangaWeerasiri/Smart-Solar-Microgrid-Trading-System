# Services

All business logic for the system lives here. This is the FAT service pattern required by
the assignment: the API owns every rule, and the web and mobile clients are UI only.

Rules that must be enforced in this folder (never in a client):

- NIC is the primary key for a prosumer.
- Reservations must be scheduled within 7 days.
- Updates and cancellations require at least 12 hours' notice.
- A node cannot be deactivated while active reservations exist.
- Only a Backoffice user can reactivate a deactivated prosumer.

Rules for this folder:

- One service per area (e.g. `ReservationService`, `StationService`, `UserService`).
- Each service implements an interface from `Services/Interfaces/` and is registered in
  `Program.cs`.
- Controllers stay thin: validate the request, call a service, return the result.
