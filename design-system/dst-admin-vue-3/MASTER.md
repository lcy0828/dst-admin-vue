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
| Primary action | `#3f7656` | `--primary-color` |
| Primary hover | `#799f89` | Element Plus primary light token |
| Warm accent / warning | `#b85c1e` | `--accent-color`, `--warning-color` |
| Success / online | `#4f8a5b` | `--success-color` |
| Danger | `#c94f4f` | `--danger-color` |
| Page background | `#f5f6f2` | `--bg-color` |
| Surface | `#ffffff` | `--surface-color` |
| Muted surface | `#f0f3ee` | `--surface-muted` |
| Sidebar | `#2f5b43` | `--sidebar-color` |
| Sidebar deep | `#254936` | `--sidebar-color-deep` |
| Sidebar text | `#eaf2ec` | `--sidebar-text` |
| Sidebar active | `#ffbd78` | `--sidebar-active` |
| Primary text | `#26352e` | `--text-primary` |
| Regular text | `#536159` | `--text-regular` |
| Border | `#dce4dd` | `--border-color` |

Primary green owns controls, links, focus and active content states. Warm orange is limited to warnings and the active sidebar marker so the two hues do not compete across every component.

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
