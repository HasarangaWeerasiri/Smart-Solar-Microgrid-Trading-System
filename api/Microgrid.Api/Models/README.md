# Models

MongoDB document classes — one class per collection, mapping directly to what is stored
in the database.

Planned collections for this project:

- `User` — Backoffice / Grid Operator / Prosumer accounts (NIC is the prosumer primary key)
- `SolarStationInfo` — microgrid nodes, GPS location, capacity (kW/h)
- `EnergyBookingSlots` — battery storage slots available at a station
- `EnergyReservation` — power trading reservations made by prosumers

Rules for this folder:

- Documents only: `[BsonId]`, `[BsonElement]` and plain properties.
- No business rules here — validation and workflow live in `Services/`.
- These classes are never returned straight to clients; map them to a DTO first.
