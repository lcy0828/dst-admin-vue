# DST Admin Vue 3 Design System

This file is the visual migration contract for the Vue 3 upgrade.

## Non-Negotiable Migration Rules

- Preserve every Vue 2 page, route, menu level, table column, form field, dialog, and command entry.
- Preserve the legacy information density, content width, and drill-down workflow.
- Theme changes must be implemented through shared tokens or equivalent color replacement. They must not rearrange page structure.
- Do not add mock, fixture, sample, or in-memory data to user-facing flows.
- Empty and error states must reflect the real API result instead of silently substituting generated data.
- Options API is allowed during migration. Compatibility work must not become a feature rewrite.

## Product Pattern

- Product: DST server operations dashboard
- Pattern: data-dense dashboard with drill-down pages
- Default density: compact
- Card radius: 6px; dialogs may use 8px
- Page padding: 16px on desktop, 12px on compact screens
- Controls: keep filters and commands adjacent to the data they affect
- Navigation: keep the legacy left sidebar, header, and breadcrumb hierarchy; use an overlay drawer on compact screens

## Palette

`石墨朱橙` is the default theme. The system settings page also exposes `翡翠橙光`, `青柚珊瑚`, and `靛蓝琥珀`; selecting one previews the full token set immediately, while saving persists its primary color through the existing `ui.theme` field. Unknown custom primary colors use the graphite structural palette so legacy color customization remains compatible.

| Role | Value | Token |
| --- | --- | --- |
| Primary action | `#e5482d` | `--primary-color` |
| Primary hover | `#ed7f6c` | Element Plus primary light token |
| Warm accent | `#f59e0b` | `--accent-color` |
| Warning | `#c97908` | `--warning-color` |
| Success / online | `#2f8a57` | `--success-color` |
| Danger | `#d14343` | `--danger-color` |
| Page background | `#f7f7f5` | `--bg-color` |
| Surface | `#ffffff` | `--surface-color` |
| Muted surface | `#f0f1ee` | `--surface-muted` |
| Sidebar | `#242626` | `--sidebar-color` |
| Sidebar deep | `#1b1d1c` | `--sidebar-color-deep` |
| Sidebar text | `#e9ece9` | `--sidebar-text` |
| Sidebar active | `#ffb24a` | `--sidebar-active` |
| Primary text | `#252826` | `--text-primary` |
| Regular text | `#4f5551` | `--text-regular` |
| Border | `#e1e4e1` | `--border-color` |

Vermilion owns controls, links, focus, and active content states. Amber is limited to secondary emphasis and the active sidebar marker so the two warm hues do not compete across every component. Semantic success, warning, and danger colors remain stable across presets.

### Theme Presets

| Preset | Primary | Accent | Sidebar | Background |
| --- | --- | --- | --- | --- |
| 石墨朱橙 (default) | `#e5482d` | `#f59e0b` | `#242626` | `#f7f7f5` |
| 翡翠橙光 | `#0f8a5f` | `#ff7a1a` | `#102a24` | `#f5f8f6` |
| 青柚珊瑚 | `#0e8f88` | `#ff6b4a` | `#173b3f` | `#f5f9f8` |
| 靛蓝琥珀 | `#4f46e5` | `#f59e0b` | `#25294a` | `#f7f7fc` |

## Typography And Spacing

- Keep the existing Chinese system font stack to avoid network font dependencies and layout shifts.
- Body text remains 14px. Compact panels must not use display-sized headings.
- Use a 4px spacing grid. Default page gap is 16px, section gap is 12px, and compact-screen card padding is 12px.
- Default controls are 36px high, small controls are 32px, and compact-screen primary controls are 40px where space allows.
- Page titles are 18px/28px and card headings are 16px/24px. Large display text is not used inside admin panels.
- Do not turn page sections into decorative cards or place cards inside cards.

## Interaction

- Keep every legacy action in its existing location.
- Use Element Plus SVG icons through the legacy icon compatibility map.
- Clickable controls must have visible hover and keyboard focus states.
- Button color follows semantics: primary for the page's main action, danger only for destructive actions, warning for risky or attention-required actions, and neutral for secondary actions.
- Toolbars and filters wrap as groups; table containers scroll horizontally rather than compressing columns into unreadable widths.
- Pagination must wrap and remain fully reachable at 375px.
- Honor `prefers-reduced-motion`.
- Dialog visibility uses Vue 3 `v-model`; pagination keeps controlled current page and page size behavior.

## Forbidden Patterns

- Removing, merging, or hiding a legacy function during visual migration
- Replacing API responses with sample data
- Marketing-style hero sections, oversized headings, floating page sections, or decorative gradients
- Cold blue or metallic gray as the dominant palette
- Layout-shifting hover transforms
- Low-contrast placeholder or secondary text

## Verification

- Build every route, including hidden detail routes.
- Compare route and page inventories against commit `527c140b`.
- Verify at 375px, 768px, 1024px, and 1440px when a browser runner is available.
- Verify login, menus, forms, tables, dialogs, pagination, uploads, terminal views, and charts against a real backend.
- Treat an unavailable backend as an explicit empty/error state, never as permission to use mock data.
