

# Changelog

All notable changes to this project will be documented here.

---

## \[2025-09-01]

### Fixed

* **Aspect ratio precedence**

  * CSS var order changed so `--grid-ratio` (per-folder/manifest override) always takes priority, then per-level defaults (`--tile-aspect-*`), then fallback `1/1`.
  * Prevented leaf-native aspect from overwriting explicit overrides by checking for `--grid-ratio` before applying native dimensions.
  * Ensures `"aspectRatio": "W / H"` manifests reliably override leaf grids.

* **Top/sub covers**

  * Forced `object-fit: cover` on top/sub folder tiles to avoid letterboxing when `--leaf-native-aspect` is enabled.

### Improved

* Clean control separation:

  * `--leaf-native-aspect`: toggles native ratios for leaf images.
  * `--tile-aspect-leaf`: fallback fixed ratio when native is off.
  * `--grid-ratio`: per-folder override.
* Precedence chain clarified: **override ➜ native ➜ per-level default ➜ 1/1.**

---

## \[2025-08-31]

### Fixed

* **Grid columns**

  * Removed hard-coded 4-column setting on Portfolio top page; now respects `--grid-max-default`.
  * `max_columns` overrides from `.order`/manifest now take precedence over “special case” logic (e.g. 2-image grids).

### Improved

* Manifest parsing

  * `.order` directives (`max_columns`, `aspect_ratio`, `title_display`) merged into manifests instead of only `max_columns`.
  * Multiple directives supported; no longer limited to first line.
  * Snake\_case and camelCase both accepted.

---

## \[2025-08-30]

### Added

* **Directive support in `.order`**

  * `max_columns = N`
  * `aspect_ratio = W / H` or `0` (disable)
  * `title_display = 0|1`
* **Custom ordering**

  * Explicit file order in `.order` respected in manifests.
* **Hidden items**

  * Dotted entries (`.filename`) in `.order` now excluded from manifests.

---

## \[2025-08-29]

### Added

* **Motion TOP page**

  * Static `/motion` index built from `.top.json` and `.videos.json`.
  * Two-column grid desktop, single-column mobile.
  * Lightbox for root videos.
  * Uses pre-generated JPEG covers (`*.jpg.cover`), with mid-frame fallback planned.
* **Blob storage**

  * Adjustments to fit within Vercel Blob bandwidth limits.

---

## \[2025-08-27]

### Improved

* **Breadcrumbs**

  * Unified placement: below header inside page content for consistency across stills and motion.
* **Grid density toggle**

  * Toolbar buttons to switch between “comfortable” and “compact” spacing.

---

## \[2025-08-25]

### Added

* **Motion gallery logic**

  * `public/Motion/` structure defined: subdirs as projects, loose videos as leaves.
  * `.order` files required per subdir; control ordering inside sub-galleries.
  * Root `.videos` file generated as user-facing manifest.
  * Fallback ordering = alphabetical if `.order` missing.
* **Tile cover rules**

  * Tile covers sourced from `.cover` or first ordered image.
  * Custom covers supported via `*.ext.cover` siblings, hidden from gallery display.

---

## \[2025-08-15]

### Improved

* **Gallery rendering**

  * Split “mixed galleries” (dirs + images) into subsections; deferred to later “Section” branch for full support.
* **.sections support** planned for ordering subsections.

---

## \[2025-08-12]

### Added

* **`gather.sh` script**

  * Moves files by filename match with support for:

    * `--dryrun`, `--not`, `--to`, `-v`, `-i`, `-r`.
  * Avoids creating empty dirs.
  * Fast, non-recursive matching by default.

---

## \[2025-08-01 — 08-11]

### Initial milestones

* **Portfolio site skeleton**

  * Next.js + Tailwind + TypeScript base.
  * Folder-based galleries (`public/Portfolio/`) auto-manifested with `.order`, `.cover`, `.folders`, `.images`.
  * Breadcrumb component with base label.
* **Grid component**

  * Responsive columns with media queries.
  * Support for folder tiles, image tiles, and video tiles.
  * Aspect ratio controlled by CSS vars (`--tile-aspect-*`).
* **Lightbox**

  * Added `LightboxImage` for leaf galleries with keyboard navigation.
* **Header & navigation**

  * Sticky header with brand link and nav items.
  * Basic styling in `globals.css` (neutral, no shadows, no rounded corners).
* **Deployment**

  * First deploys to Vercel; fixed full-bleed 1-col mobile layout issues.

