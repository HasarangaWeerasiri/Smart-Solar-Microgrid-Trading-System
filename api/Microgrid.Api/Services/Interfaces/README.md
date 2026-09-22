# Services / Interfaces

Interface for each service in `Services/` (e.g. `IReservationService` implemented by
`ReservationService`).

Why the interfaces exist:

- Controllers depend on the interface, not the concrete class, so dependency injection
  stays loose and the implementation can change without touching the controller.
- Registered in `Program.cs` as
  `builder.Services.AddScoped<IReservationService, ReservationService>();`
