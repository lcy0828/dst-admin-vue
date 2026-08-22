# Internationalization

The frontend uses `vue-i18n`. `src/i18n/messages.js` assembles the base catalog and functional catalogs from the same directory.

## Supported locales

- `zh-CN`: default and fallback locale
- `en-US`: supported
- `ja-JP`: reserved by the backend settings contract, but must remain disabled until a complete catalog is added

The `ui.language` system setting provides the default locale for browsers that have not made an explicit choice. The global language switch and login-page selector persist each browser's choice in `dst-admin-locale`; that local choice remains authoritative across authentication and route changes. `applySystemPreferences()` updates the Vue locale and document `lang` attribute without overwriting the browser preference.

## Data contract

API values, database values, rule IDs, log types, match modes, and migration statuses stay in their stable internal form. Never send translated values to the backend.

Examples:

- Store and filter with `worldgen`; render it through `logTypeLabel()`.
- Store `multi_line`; render it through `rules.matchModes.multi_line`.
- Preserve unknown custom log types exactly as entered by the user.
- Localize built-in rule metadata by stable `builtin-*` IDs; never rewrite user-created rule names.

## Adding interface text

Use `$t()` in Options API templates and methods, or `useI18n()` in `<script setup>` components. Navigation and route metadata use message keys rather than translated labels.

Do not add raw user-facing text to a component when an i18n key is appropriate. Server-provided user content, world names, room names, mod names, log content, and custom rule metadata must remain unchanged.

## Adding a locale

1. Add the locale catalog to the relevant module under `src/i18n/` and assemble it in `src/i18n/messages.js`.
2. Add it to `SUPPORTED_LOCALES` in `src/i18n/index.js`.
3. Enable the option in `SystemSettings.vue`.
4. Run `npm test`; the catalog parity test requires every locale to expose the same keys.
5. Run `npm run lint` and `npm run build`.
