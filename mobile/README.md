# Mobile - Native Android app (Kotlin, SQLite, Maps, QR)

Android client for solar prosumers and grid operators.

This app is a **user interface only**. It holds no business rules. Everything it shows comes
from the C# Web API over REST. The local SQLite database only keeps the login session and
reference data copied from the API.

## Requirements

- Android Studio (any recent version) with the Android SDK
- JDK 17 or newer (Android Studio ships its own)
- The API running, see `../api/README.md`

## Project setup

| Setting | Value |
| --- | --- |
| Language | Kotlin |
| Layouts | XML views (not Jetpack Compose) |
| Package | `lk.sliit.microgrid` |
| minSdk | 24 (Android 7.0) |
| compileSdk / targetSdk | 37 |
| Gradle | 9.6.0 |
| Android Gradle Plugin | 9.4.1 |

Open the `mobile` folder in Android Studio and let Gradle sync. `local.properties` is
created automatically and is git-ignored, because the SDK path differs per machine.

## Running it

1. Start the API first: `cd api/Microgrid.Api` then `dotnet run`
2. Start an emulator, or connect a phone
3. Press Run in Android Studio, or from a terminal:

```bash
cd mobile
./gradlew assembleDebug        # Windows: gradlew.bat assembleDebug
```

Sign in with a Prosumer NIC or a Grid Operator email. Backoffice accounts are refused -
they use the web application.

## The API address

`ApiClient.BASE_URL` in `app/src/main/java/lk/sliit/microgrid/data/remote/ApiClient.kt` is
the **only** place the server address appears.

| Where the app runs | Address to use |
| --- | --- |
| Android emulator | `http://10.0.2.2:5288` (default - the emulator's alias for this machine) |
| Real phone on the same Wi-Fi | `http://<your-machine-ip>:5288`, for example `http://192.168.1.6:5288` |
| Published on IIS | The IIS address |

If you change it to a new address, add that address to
`app/src/main/res/xml/network_security_config.xml` too, otherwise Android blocks the
plain HTTP call.

## Folder guide

| Path | Purpose |
| --- | --- |
| `data/remote/ApiClient.kt` | The only place that calls the API. Base URL, token and errors |
| `data/remote/AuthApi.kt` | Calls for the login endpoints |
| `data/local/DbHelper.kt` | `SQLiteOpenHelper` - creates the local database |
| `data/local/SessionManager.kt` | Saves and reads the logged-in user in SQLite |
| `data/model/` | Plain data classes |
| `ui/` | One Activity per screen, with a matching layout in `res/layout` |

## Rules for this folder

- Pure native Android only. No Flutter, React Native, Xamarin, MAUI, Ionic or Capacitor.
- Raw `SQLiteOpenHelper` for local storage. **Not Room.**
- Every server call goes through `ApiClient`. Do not open a connection anywhere else.
- No business rules here. The 7-day rule, the 12-hour rule and NIC checks live in the API.
- Network calls must run on a background thread. Android crashes if you call from the main thread.

## Still to add

Google Maps SDK and QR code scanning are not added yet. They arrive with the modules that
need them.
