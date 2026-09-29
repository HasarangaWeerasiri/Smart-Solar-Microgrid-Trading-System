# DTOs

Data Transfer Objects — the request and response shapes exchanged with the web and
mobile clients.

Rules for this folder:

- Keep request DTOs separate from response DTOs (e.g. `CreateReservationRequest`,
  `ReservationResponse`).
- Never expose a `Models/` document directly; map to a DTO so internal fields such as
  password hashes never reach a client.
- Input validation attributes (`[Required]`, `[StringLength]`) belong here; the business
  rules (7-day window, 12-hour notice, NIC checks) belong in `Services/`.
