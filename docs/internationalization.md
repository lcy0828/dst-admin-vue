# Internationalization

The frontend uses `vue-i18n` and stores locale resources in `src/i18n/messages.js`.

## Supported locales

- `zh-CN`: default and fallback locale
- `en-US`: supported
- `ja-JP`: reserved by the backend settings contract, but must remain disabled until a complete catalog is added

The selected locale is persisted through the existing `ui.language` system setting. `applySystemPreferences()` updates both the active Vue locale and the document `lang` attribute.

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

1. Add the locale catalog to `src/i18n/messages.js`.
2. Add it to `SUPPORTED_LOCALES` in `src/i18n/index.js`.
3. Enable the option in `SystemSettings.vue`.
4. Run `npm test`; the catalog parity test requires every locale to expose the same keys.
5. Run `npm run lint` and `npm run build`.
