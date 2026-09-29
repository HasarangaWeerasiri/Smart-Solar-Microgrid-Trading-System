# Web - React + Tailwind frontend

Backoffice and Grid Operator web client for the Smart Solar Microgrid Trading System.

This app is a **user interface only**. It holds no business rules and never touches
MongoDB. Everything it shows comes from the C# Web API over REST.

## Requirements

- Node.js 20 or newer (`node -v`)
- The API running, see `../api/README.md`

## Setup

```bash
cd web
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm run dev
```

Open http://localhost:5173

The port is fixed to 5173 because that is the origin allowed by the API's `WebClient`
CORS policy. To change it, update `Cors:AllowedOrigins` in the API's `appsettings.json`
as well.

## Configuration

`.env` holds one setting (the file is git-ignored, so each member can point somewhere else):

| Key | Meaning |
| --- | --- |
| `VITE_API_BASE_URL` | Address of the Web API. Default `http://localhost:5288` |

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Build the production files into `dist/` |
| `npm run preview` | Serve the built files locally |

## Folder guide

| Path | Purpose |
| --- | --- |
| `src/api/client.js` | The only place that calls the API. Base URL, token and errors live here |
| `src/api/auth.js` | Calls for the login endpoints |
| `src/context/AuthContext.jsx` | Holds the signed-in user, restores the session on refresh |
| `src/components/ProtectedRoute.jsx` | Blocks pages when not logged in or the role is wrong |
| `src/components/Layout.jsx` | Header, navigation and logout around signed-in pages |
| `src/pages/` | One file per screen |
| `src/roles.js` | Role names and the home page for each role |

## Rules for this folder

- Every call to the server goes through `src/api/client.js`. Do not call `fetch` from a page.
- No business rules here. The 7-day rule, the 12-hour rule and NIC checks live in the API.
- Never add a database driver such as `mongodb` or `mongoose` to this project.
- Role checks in `ProtectedRoute` are for tidy navigation only. The API enforces access.

## Logging in

Staff sign in with their email. Prosumers cannot use this site - they use the Android app,
and the login page tells them so.

The API creates a Backoffice user on first run. See the API README for those details.
