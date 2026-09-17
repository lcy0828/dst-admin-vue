# DST Admin Web

[简体中文](README.md) | **English**

The Vue 3 frontend for DST Admin. For deployment, use the [main repository](https://github.com/lcy0828/dst-admin-go); its packages and images include the UI.

## Development

Use Node.js 22+. The default backend address is `http://127.0.0.1:8000`.

```bash
git clone --branch master https://github.com/lcy0828/dst-admin-vue.git dst-admin-vue-v3
cd dst-admin-vue-v3
npm ci
npm run dev
```

Set `VITE_API_PROXY_TARGET` to change the backend address. See the [development guide](https://github.com/lcy0828/dst-admin-go/blob/feature/v2-rebuild/docs/development.en.md).

## Checks and build

```bash
npm run lint -- --no-fix
npm test
npm run build
```

Build output is in `dist/`. See [internationalization](docs/internationalization.md).

`master` is the current version. The old Vue 2 version is preserved on `legacy/vue2-original`.
