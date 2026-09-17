# DST Admin Web

[简体中文（默认）](README.md) | **English**

DST Admin Web is the browser interface for DST Admin. It forms one Don't Starve Together server management project together with [`dst-admin-go`](https://git.luocaiyi.top/dst/dst-admin-go).

Server owners do not need to run a separate frontend service. All-in-One and native installations build these pages and serve them from the Go management service at the same origin as the API.

## What it manages

- Rooms and world shards such as Master and Caves.
- Players, character state, chat, and live logs.
- Steam Workshop mods and per-world configuration.
- Manual/scheduled backups, save imports, and recovery.
- Local and Agent game installation status, downloads, existing server directories, game updates, and LuaJIT2.
- Local resources, remote hosts, and world placement.

## Start here

The installation entry point is the [main DST Admin repository](https://git.luocaiyi.top/dst/dst-admin-go). Its README defaults to Chinese and links to English.

When the repositories are checked out next to each other, read:

- [Installation and startup](../dst-admin-go/docs/startup-guide.en.md): Linux/macOS native setup, Agent connections, and save protection.
- [Development setup](../dst-admin-go/docs/development.en.md): isolated configuration, Go API, Vite proxy, and production serving.
- [Game installation management](../dst-admin-go/docs/game-installation-management.en.md) and [LuaJIT installation](../dst-admin-go/docs/luajit-installation.en.md).

These sibling paths are for local checkouts. When reading online, follow the documentation links from the backend README.

This is a source preview. Use matching branches:

- Backend: `feature/v2-rebuild`
- Frontend: `master`

Docker All-in-One on x86_64 Linux is recommended. On a 2-core/4-GB host, run Master and Caves first.

## Production addresses

| Deployment | Default address |
| --- | --- |
| Docker All-in-One | `http://SERVER_IP:8080` |
| Linux native | `http://SERVER_IP:8000` |
| macOS native | `http://127.0.0.1:8000` |

Port `5173` is for development only. Production does not require a separate Vite process.

## Frontend development

Use Node.js 24 LTS and npm. Run from this repository:

```bash
npm ci
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

By default, `/api` is proxied to `http://127.0.0.1:8000`; start the backend separately using the development guide above. Open `http://127.0.0.1:5173`.
If an existing service uses `5173`, use another port or follow the [registered local service instructions (Chinese)](docs/local-runtime.md); do not simply terminate it.

For a backend on a different port, such as `18080`:

```bash
VITE_API_PROXY_TARGET=http://127.0.0.1:18080 \
  npm run dev -- --host 127.0.0.1 --port 15173 --strictPort
```

`VITE_API_BASE_URL` defaults to `/api` and normally stays unchanged. `VITE_*` values become browser code; do not store secrets in them.

## Build and verify

```bash
npm test
npm run lint
npm run build
```

Output goes to `dist/`. In production, point the Go service's `DST_ADMIN_WEB_ROOT` at this directory to serve the UI and `/api/v2` from one origin. `npm run preview` serves only a static preview and does not include the backend.
Upgrade matching frontend/backend artifacts together and preserve management configuration, the database, and saves.

## Before use

- A reachable web page does not prove that DST UDP ports are reachable from the internet.
- Downloaded mods must be added to rooms; enabling or configuring them requires restarting the relevant worlds.
- All-in-One stores configuration, saves, game files, mods, and backups under host `/opt/dst` by default.
- A single host or All-in-One instance does not need an extra Agent; add one to manage another machine.
- Season/day snapshots shown after a world stops are stale and do not indicate a running world.
