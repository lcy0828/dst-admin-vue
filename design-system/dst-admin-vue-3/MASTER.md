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
- Card radius: 4px
- Page padding: keep the legacy 10px content padding
- Controls: keep filters and commands adjacent to the data they affect
- Navigation: keep the legacy left sidebar, header, and breadcrumb hierarchy

## Palette

| Role | Value | Token |
| --- | --- | --- |
| Primary action | `#d97932` | `--primary-color` |
| Primary hover | `#e59252` | Element Plus primary light token |
| Success / online | `#4f8a5b` | `--success-color` |
| Warning | `#d99b32` | `--warning-color` |
| Danger | `#c94f4f` | `--danger-color` |
| Page background | `#f6f3ea` | `--bg-color` |
| Surface | `#ffffff` | `--surface-color` |
| Muted surface | `#f1f4ed` | `--surface-muted` |
| Sidebar | `#315a46` | `--sidebar-color` |
| Sidebar deep | `#264736` | `--sidebar-color-deep` |
| Sidebar text | `#e2ede5` | `--sidebar-text` |
| Sidebar active | `#ffb15e` | `--sidebar-active` |
| Primary text | `#27352f` | `--text-primary` |
| Regular text | `#536159` | `--text-regular` |
| Border | `#dde4dc` | `--border-color` |

## Typography And Spacing

- Keep the existing Chinese system font stack to avoid network font dependencies and layout shifts.
- Body text remains 14px. Compact panels must not use display-sized headings.
- Preserve existing page and component spacing unless a Vue 3 component requires a compatibility correction.
- Do not turn page sections into decorative cards or place cards inside cards.

## Interaction

- Keep every legacy action in its existing location.
- Use Element Plus SVG icons through the legacy icon compatibility map.
- Clickable controls must have visible hover and keyboard focus states.
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
