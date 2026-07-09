# Endurix Design System — Conventions for the Design Agent

## Setup — no provider needed

Most Endurix components work without a wrapper. The one exception:  
**`StatCard` with a `tooltip` prop requires `<TooltipProvider>` as a parent.** Wrap the component tree when using that prop:

```jsx
import { TooltipProvider } from './components/general/Tooltip/Tooltip';
<TooltipProvider><StatCard label="CTL" value="68" tooltip="Chronic Training Load" /></TooltipProvider>
```

No theme provider is needed. Colors come from CSS custom properties in `styles.css`.

## Styling — Tailwind v4 utility classes + Endurix brand tokens

Use Tailwind utility classes for layout glue. Component surfaces (bg, text, border) use CSS custom properties.

**Brand color classes — always prefer these over generic Tailwind colors:**

| Class | Value | Use |
|---|---|---|
| `bg-endurix-orange` | #FF6800 | primary CTA buttons, accent highlights |
| `text-endurix-orange` | #FF6800 | orange text, metric values, chip labels |
| `bg-endurix-black` | #111317 | dark fills |
| `text-endurix-black` | #111317 | primary text on light bg |
| `bg-endurix-paper` | #F2F2F2 | page backgrounds |
| `bg-endurix-stone` | #EBE9EC | subtle container fills |

**Semantic token classes (from CSS variables — adapt to light/dark automatically):**

| Class | Role |
|---|---|
| `bg-background` | page background |
| `bg-card` | card / elevated surface |
| `bg-muted` | secondary content zone |
| `text-foreground` | primary text |
| `text-muted-foreground` | secondary / hint text |
| `border-border` | default border |
| `bg-primary` / `text-primary-foreground` | navy primary (#4e6073) |
| `bg-destructive` / `text-destructive` | error red |
| `text-endurix-orange/70` | opacity modifier syntax works for all brand classes |

**Opacity modifiers:** Use the Tailwind `/<percent>` syntax: `bg-endurix-black/15`, `border-endurix-orange/30`.

**Font families** (CSS variables, NOT utility classes — these are injected at runtime):
- `style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}` — data/metric labels (MonospaceLabel, StatCard)
- `style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}` — display numbers (MetricCard values)
- Default body font: `var(--font-inter, system-ui)` — covered by `font-sans`

## Key component APIs

**Button variants:** `default | outline | secondary | ghost | destructive | link | orange | outline-brand`  
→ Use `variant="orange"` for primary CTAs (the Endurix call-to-action style).

**Badge variants:** `default | secondary | outline | destructive | solid | orange | tag`  
→ `solid`: all-caps black pill; `orange`: all-caps orange pill; `tag`: bordered uppercase label.

**StatCard chips:** `chipColor` accepts `orange | green | red | neutral` — maps to brand-colored micro badges.

**MonospaceLabel sizes:** `sm | xs | micro` — all-caps tracking-widest labels in IBM Plex Mono.

## Where the truth lives

Read `styles.css` (and its imports, especially `_ds_bundle.css`) for the full token and utility vocabulary before styling. Each component's `.d.ts` file in its folder has its prop contract. Per-component usage notes are in `.prompt.md`.

## Example

```jsx
import { StatCard } from './components/dashboard/StatCard/StatCard';
import { Badge }    from './components/general/Badge/Badge';
import { Button }   from './components/general/Button/Button';

// A coach dashboard card: metric + CTA
<div className="bg-card border border-border/15 p-6 flex flex-col gap-4">
  <div className="flex items-center justify-between">
    <span className="text-xs text-muted-foreground uppercase tracking-widest">Weekly TSS</span>
    <Badge variant="orange">High load</Badge>
  </div>
  <p className="text-4xl font-bold text-endurix-black dark:text-foreground">312</p>
  <Button variant="orange" size="sm">Review plan</Button>
</div>
```
