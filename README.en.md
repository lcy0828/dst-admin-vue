# DST Admin Web

[简体中文（默认）](README.md) | **English**

The frontend development repository for DST Admin. **For deployment, use only the [main DST Admin repository](https://github.com/lcy0828/dst-admin-go)** for complete images, native packages, initialization, game installation, and upgrades. The management binary embeds the UI at build time; server owners do not deploy this repository separately.

## Versions

- `master`: the current official Vue 3 frontend; backend packaging defaults to its latest commit.
- `legacy/vue2-original`: the preserved Vue 2 version, excluded from current packages.

## Development

Use Node.js 22+ and npm. Prepare the backend API, then run:

```bash
npm ci
VITE_API_PROXY_TARGET=http://127.0.0.1:8000 npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Open `http://127.0.0.1:5173`. `/api` proxies to `http://127.0.0.1:8000` by default. If ports are occupied, choose another port and isolated data paths; do not terminate existing services. See the main repository's [development guide](https://github.com/lcy0828/dst-admin-go/blob/feature/v2-rebuild/docs/development.en.md).

`VITE_API_BASE_URL` defaults to `/api`. `VITE_*` values enter browser code and must not contain secrets.

## Validation and builds

```bash
npm run lint -- --no-fix
npm test
npm run build
```

Output is `dist/`. Backend packaging builds the selected revision, embeds it in the Go binary, and records its exact commit. `npm run preview` is only a static preview. During development, set backend `DST_ADMIN_WEB_ROOT` to `dist/` if needed; normal installation needs no override.

The UI defaults to Chinese and supports English. See [internationalization](docs/internationalization.md). Keep internal progress, discussions, and local environment notes in ignored `.local-docs/`, outside releases.
