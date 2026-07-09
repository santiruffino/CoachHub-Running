# Endurix Design Sync — Notes

## CSS compilation step (required before every rebuild)

`cssEntry` in `config.json` points at `.ds-sync/compiled.css`, NOT at `src/app/globals.css` directly.
`globals.css` starts with `@import "tailwindcss"` — a Tailwind v4 PostCSS build-time directive, not a real
CSS file. The converter can't consume it as-is; it must be compiled first.

To regenerate `.ds-sync/compiled.css` (required whenever globals.css or the Tailwind config changes):

```bash
node -e "
const postcss = require('postcss');
const tw = require('@tailwindcss/postcss');
const fs = require('fs');
const src = fs.readFileSync('src/app/globals.css', 'utf8');
postcss([tw()]).process(src, { from: 'src/app/globals.css' }).then(r => {
  fs.writeFileSync('.ds-sync/compiled.css', r.css);
  console.log('compiled.css written:', r.css.length, 'bytes');
});
"
```

Output should be ~180-200 KB. This file is gitignored (`.ds-sync/` is excluded from git).

## Token coverage caveat

`.ds-sync/compiled.css` is produced from the globals.css PostCSS pipeline but Tailwind v4 only emits
utility classes it sees in the scanned source files. If you add new Endurix brand utility classes
(e.g. `text-endurix-lavender`) that aren't used anywhere in `src/`, they won't appear in compiled.css.
To force inclusion, add a safelist or use the class somewhere in a source file before re-running compilation.

## Next.js-coupled components excluded

The following components were excluded from the design system bundle (`componentSrcMap: null` in config.json)
because they import from `next/navigation`, `next/link`, `next-intl`, `next-themes`, or are page-level:

- **Navigation/layout**: BackButton, LocaleSwitcher, ThemeToggle, PageHeader, BottomNav, Navbar, MobileHeader, EditorialLayout
- **Next.js infrastructure**: GoogleAnalytics, InstallPrompt
- **Landing page sections**: CTASection, CoachOpsSection, FeaturesSection, Footer, HeroSection, ProductFeaturesSection, RoadmapSection, WishlistSection
- **Complex feature components** (charts, chat, calendar — app-logic-coupled): AthleteWeeklyCalendar, CalendarDayColumn, CalendarRestDayPlaceholder, CoachAthleteChat, CoachNotes, ConversationList, CriticalAlertItem, GroupStatusCard, LoadMetricsTrendChart, PerformanceTrendChart, WeeklyLoadChart, TimelineItem

## Radix portal components — static visual previews

`Dialog` and `AlertDialog` use Radix Dialog under the hood, which renders content into `document.body`
via a portal — not into `#root`. Playwright screenshot verification captures `#root`, so open portals
would appear blank. Both previews in `.design-sync/previews/` are therefore static visual representations
(plain divs styled to match the open dialog surface) rather than live Radix renders.

`DropdownMenu` has the same portal issue for its open menu. Fixed via config override:
`"overrides": {"DropdownMenu": {"cardMode": "single", "primaryStory": "Preview"}}`.

## Synthetic entry file

`src/ds-index.ts` was created as a synthetic entry point because:
1. The package name is "frontend" (from package.json), which can't self-install in `node_modules/`
2. shadcn/ui uses lowercase filenames (`button.tsx`, `card.tsx`) not auto-discovered by the PascalCase scanner

All 30 components are explicitly re-exported from `src/ds-index.ts`. If you add new components to the
design system, add them to both `src/ds-index.ts` and `componentSrcMap` in `.design-sync/config.json`.

## Runtime fonts

`--font-inter`, `--font-manrope`, `--font-exo-2`, `--font-ibm-plex-mono` are injected at runtime by
Next.js (`next/font/google`). They're unavailable in the design sandbox. `runtimeFontPrefixes` in
config.json suppresses FONT_MISSING warnings. Use inline `style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}`
for font-sensitive components (MonospaceLabel, StatCard, MetricCard).

## Re-sync command

```bash
node .ds-sync/package-build.mjs \
  --config .design-sync/config.json \
  --node-modules ./node_modules \
  --entry ./src/ds-index.ts \
  --out ./ds-bundle
```

Run CSS compilation step first if globals.css or Tailwind config changed.
