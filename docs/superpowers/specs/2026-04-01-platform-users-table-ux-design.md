# Platform users table — UX (readability)

**Date:** 2026-04-01  
**Status:** Approved by product owner (chat)

## Goal

Improve scanability of the super-admin «All platform memberships» screen without changing data or API.

## Decisions

1. **Scroll container:** Single `overflow-auto` region with `max-h-96` so vertical scroll stays inside the card; sticky header applies relative to this region.
2. **Sticky header:** Second header row (column titles) uses `position: sticky` with `top` offset under the group row; first header row (groups) sticks at `top: 0`.
3. **Sticky first column:** «User» column sticks on horizontal scroll; right border separates from scrolling content; row hover uses `group-hover:bg-muted/50` on the sticky cell.
4. **Grouped headers:** One row of group labels (Identity 3 cols | Billing | Security | Meta), one row of existing column titles.
5. **Stats strip:** Uniform card height (`min-h-20`), `leading-snug` on labels for long Russian strings.
6. **Hint:** Muted one-line note above the table that the table may scroll horizontally.

## Out of scope

- Mobile card layout (separate list view).
- New filters or actions.
