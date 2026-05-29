# Dashboard Design System

> Reference for building Endurix dashboards that match the landing page aesthetic.
> Based on the "Performance Curator" philosophy from `DESIGN.md`.

---

## 1. Colors

All tokens are defined in `src/app/globals.css` and mapped to Tailwind via `@theme inline`.

### Brand Palette

| Token                      | Hex       | Tailwind Class                              | Usage                                           |
|----------------------------|-----------|---------------------------------------------|-------------------------------------------------|
| `--color-endurix-orange`   | `#FF6800` | `bg-endurix-orange` / `text-endurix-orange` | Primary accent, CTAs, active states, highlights |
| `--color-endurix-black`    | `#111317` | `bg-endurix-black` / `text-endurix-black`   | Light mode text, dark elements, badges          |
| `--color-endurix-paper`    | `#F2F2F2` | `bg-endurix-paper`                          | Light mode main background                      |
| `--color-endurix-stone`    | `#EBE9EC` | `bg-endurix-stone`                          | Secondary surfaces, subtle fills                |
| `--color-endurix-dark`     | `#1C1207` | `bg-endurix-dark`                           | Dark section backgrounds (CTA, footer)          |
| `--color-endurix-lavender` | `#D9D6FF` | `bg-endurix-lavender`                       | Accent highlight (sparingly)                    |

### Surface Hierarchy (Light Mode)

Use background shifts, not borders, to define zones.

| Level          | Color     | Tailwind           | Use Case                               |
|----------------|-----------|--------------------|----------------------------------------|
| Base surface   | `#f8f9fa` | `bg-background`    | Page background                        |
| Secondary zone | `#f1f4f6` | `bg-muted`         | Section backgrounds, subtle containers |
| Card (lowest)  | `#ffffff` | `bg-card`          | Interactive cards, pop-out elements    |
| Paper          | `#F2F2F2` | `bg-endurix-paper` | Landing-style surfaces                 |

### Surface Hierarchy (Dark Mode)

| Level          | Color     | Tailwind                | Use Case             |
|----------------|-----------|-------------------------|----------------------|
| Base surface   | `#0a0f14` | `bg-background`         | Page background      |
| Secondary zone | `#131b23` | `bg-muted`              | Section backgrounds  |
| Card           | `#1a232c` | `bg-card`               | Interactive cards    |
| Text primary   | `#f8f9fa` | `text-foreground`       | Headlines, values    |
| Text secondary | `#8b9bb4` | `text-muted-foreground` | Descriptions, labels |

### Opacity Variants (Ghost Borders)

Use low-opacity black for borders instead of solid colors.

| Class                     | Opacity | Usage                          |
|---------------------------|---------|--------------------------------|
| `border-endurix-black/8`  | 8%      | Dividers within cards          |
| `border-endurix-black/10` | 10%     | Navbar border                  |
| `border-endurix-black/12` | 12%     | Card borders                   |
| `border-endurix-black/15` | 15%     | Icon containers, input borders |
| `border-endurix-black/20` | 20%     | Tag/chip borders               |
| `border-endurix-black/30` | 30%     | Hover state borders            |

Dark mode equivalents: `dark:border-border`, `dark:border-white/5`, `dark:border-white/30`.

---

## 2. Typography

Fonts loaded via `next/font/google` in `src/app/layout.tsx`.

### Font Families

| Variable               | Font                    | Tailwind                         | Usage                             |
|------------------------|-------------------------|----------------------------------|-----------------------------------|
| `--font-exo-2`         | Exo 2 (400/600/700/800) | `font-exo2` via inline style     | Headlines, buttons, nav, brand    |
| `--font-ibm-plex-mono` | IBM Plex Mono (400/500) | `font-ibm-mono` via inline style | Labels, tags, meta text, data     |
| `--font-inter`         | Inter                   | `font-sans` (default)            | Body text, descriptions           |
| `--font-manrope`       | Manrope                 | `font-display`                   | Display headlines (large metrics) |

**Important:** Exo 2 and IBM Plex Mono are applied via inline style because `next/font` uses CSS variable prefixes:

```tsx
style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
```

### Type Scale

| Pattern           | Size                               | Weight                        | Tracking          | Style                    |
|-------------------|------------------------------------|-------------------------------|-------------------|--------------------------|
| Hero headline     | `text-5xl lg:text-6xl xl:text-7xl` | `font-bold`                   | `tracking-tight`  | Exo 2, uppercase         |
| Section headline  | `text-4xl lg:text-5xl xl:text-6xl` | `font-bold`                   | `tracking-tight`  | Exo 2, uppercase         |
| Card title        | `text-xl`                          | `font-bold`                   | `tracking-tight`  | Exo 2                    |
| Metric value      | `text-4xl` / `text-5xl`            | `font-bold`                   | —                 | Exo 2                    |
| Body text         | `text-sm` / `text-base`            | `font-normal`                 | —                 | Inter                    |
| Label (monospace) | `text-[9px]` / `text-[10px]`       | `font-bold` / `font-semibold` | `tracking-widest` | IBM Plex Mono, uppercase |
| Badge/tag         | `text-[10px]`                      | `font-bold`                   | `tracking-widest` | IBM Plex Mono            |
| Micro label       | `text-[8px]` / `text-[9px]`        | `font-semibold`               | `tracking-widest` | IBM Plex Mono, uppercase |
| Button text       | `text-xs`                          | `font-bold`                   | `tracking-widest` | Exo 2                    |

---

## 3. Components

### Buttons

**Primary CTA (Orange)**
```tsx
<Link
  className="inline-flex items-center justify-center gap-2
    bg-endurix-orange text-white text-xs font-bold tracking-widest
    px-8 py-4 transition-all hover:bg-endurix-orange/90"
  style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
>
  Action →
</Link>
```

**Secondary (Outlined)**
```tsx
<Link
  className="inline-flex items-center justify-center gap-2
    border border-endurix-black dark:border-white
    text-endurix-black dark:text-white
    text-xs font-bold tracking-widest
    px-8 py-4 transition-all
    hover:bg-endurix-black dark:hover:bg-white
    hover:text-white dark:hover:text-endurix-black"
  style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
>
  Action +
</Link>
```

**Ghost (Text-only)**
```tsx
<button
  className="text-endurix-black/70 dark:text-muted-foreground
    hover:text-endurix-black dark:hover:text-foreground
    text-xs font-semibold tracking-widest transition-colors"
  style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
>
  Label
</button>
```

**Note:** Landing buttons use sharp corners (no `rounded-*`). For dashboard consistency, use `rounded-md` if matching shadcn/ui conventions, or omit for the landing aesthetic.

### Cards

**Base Card**
```tsx
<div className="border border-endurix-black/12 dark:border-border
  p-6 bg-white dark:bg-card
  hover:border-endurix-black/30 dark:hover:border-white/30
  transition-colors duration-300">
  {/* content */}
</div>
```

**Card with Orange Hover**
```tsx
<div className="border border-endurix-black/12 dark:border-border
  p-6 bg-white dark:bg-card
  hover:border-endurix-orange/50 dark:hover:border-endurix-orange/50
  transition-all duration-300 group">
  {/* content */}
</div>
```

**Card Interior Divider**
```tsx
<div className="h-px bg-endurix-black/10 dark:bg-border mb-5" />
```

### Badges / Tags

**Solid Badge**
```tsx
<span className="inline-block bg-endurix-black dark:bg-white
  text-white dark:text-endurix-black
  text-[10px] font-bold tracking-widest px-3 py-1.5"
  style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>
  LABEL
</span>
```

**Orange Badge**
```tsx
<span className="inline-block bg-endurix-orange text-white
  text-[7px] font-bold tracking-widest px-2 py-0.5"
  style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>
  STATUS
</span>
```

**Outlined Tag**
```tsx
<span className="inline-flex items-center gap-1.5
  border border-endurix-black/20 dark:border-border px-3 py-1">
  <span className="w-2 h-2 rounded-full bg-endurix-orange" />
  <span className="text-[9px] text-endurix-black dark:text-foreground
    font-medium tracking-wider"
    style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>
    Label
  </span>
</span>
```

### Labels (Monospace)

```tsx
<span className="text-[9px] text-endurix-black/50 dark:text-muted-foreground
  tracking-widest"
  style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>
  SECTION TITLE
</span>
```

### Progress Bar

```tsx
<div className="flex items-center gap-3">
  <div className="flex-1 h-1.5 bg-endurix-black/15 dark:bg-border relative">
    <div
      className="absolute inset-y-0 left-0 bg-endurix-orange"
      style={{ width: `${value}%` }}
    />
    <div
      className="absolute inset-y-0 left-0 right-0 bg-[#111317] dark:bg-white opacity-60 dark:opacity-20"
      style={{ left: `${value}%` }}
    />
  </div>
</div>
```

### Input Fields

Per DESIGN.md: no background fill, only bottom border.

```tsx
<input
  className="w-full bg-transparent border-0 border-b
    border-endurix-black/15 dark:border-border
    px-0 py-3 text-sm text-endurix-black dark:text-foreground
    placeholder:text-endurix-black/30 dark:placeholder:text-muted-foreground
    focus:border-endurix-orange focus:outline-none
    focus:shadow-[0_4px_12px_rgba(255,104,0,0.08)]"
/>
```

### Stat / Metric Card

```tsx
<article className="border border-endurix-black/12 dark:border-border
  bg-white dark:bg-card p-4">
  <div className="flex items-start justify-between gap-2">
    <span className="text-[10px] text-endurix-black/50 dark:text-muted-foreground
      tracking-widest font-semibold uppercase"
      style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>
      Metric Label
    </span>
    <span className="text-[9px] text-endurix-orange font-bold tracking-wider
      border border-endurix-orange/30 px-2 py-0.5"
      style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>
      +12.4%
    </span>
  </div>
  <p className="mt-4 text-4xl font-bold text-endurix-black dark:text-foreground
    leading-none"
    style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>
    487
  </p>
  <p className="mt-3 border-t border-endurix-black/8 dark:border-border
    pt-2 text-[9px] text-endurix-black/40 dark:text-muted-foreground
    tracking-widest uppercase"
    style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>
    Live operating signal
  </p>
</article>
```

### Data Table

```tsx
<div className="overflow-x-auto border border-endurix-black/12 dark:border-border
  bg-white dark:bg-card">
  <table className="w-full text-left">
    <thead className="border-b border-endurix-black/10 dark:border-border
      bg-muted text-[10px] uppercase tracking-[0.14em]
      text-endurix-black/50 dark:text-muted-foreground"
      style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>
      <tr>
        <th className="px-4 py-3">Column</th>
      </tr>
    </thead>
    <tbody>
      <tr className="border-b border-endurix-black/8 dark:border-border text-sm">
        <td className="px-4 py-3">Data</td>
      </tr>
    </tbody>
  </table>
</div>
```

### Timeline Item

```tsx
<div className="border-l-2 border-endurix-orange pl-4 py-2">
  <p className="text-[10px] uppercase tracking-[0.12em]
    text-endurix-black/50 dark:text-muted-foreground"
    style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>
    14:32
  </p>
  <p className="text-sm font-semibold text-endurix-black dark:text-foreground mt-1">
    Athlete Name
  </p>
  <p className="text-sm text-endurix-black/80 dark:text-muted-foreground">
    Activity details
  </p>
</div>
```

---

## 4. Layout & Spacing

### Container
```tsx
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  {/* content */}
</div>
```

### Section Spacing
- Section padding: `py-24 lg:py-32` or `py-24 lg:py-36`
- Gap between grid items: `gap-6` or `gap-6 lg:gap-8`
- Gap between sections: `space-y-5` or `space-y-8`

### Grid Patterns
- 2-column: `grid lg:grid-cols-2 gap-16 items-center`
- 3-column features: `grid md:grid-cols-3 gap-6`
- Dashboard stats: `grid grid-cols-2 lg:grid-cols-4 gap-6`
- 12-col layout: `grid grid-cols-1 gap-4 xl:grid-cols-12`

### Card Interior Padding
- Standard: `p-6`
- Compact: `p-4`
- Minimal: `p-3`

---

## 5. Rules

### The "No-Line" Rule
**1px solid borders are prohibited for sectioning.** Define zones through background color shifts:
- Place `bg-muted` sections directly against `bg-background` pages
- The ~2% brightness shift defines the zone without trapping content

### Border Philosophy
Borders that exist should use very low opacity:
- `border-endurix-black/8` for dividers within cards
- `border-endurix-black/12` for card outlines
- In dark mode: `dark:border-border` or `dark:border-white/5`

### Elevation (No Heavy Shadows)
- **Never** use heavy drop shadows
- Create depth by nesting `bg-card` inside `bg-muted` sections ("soft lift")
- For active elements: `box-shadow: 0 20px 40px rgba(43, 52, 55, 0.05)` (5% opacity)
- Dark mode: use `dark:border-white/5` instead of shadows

### Color Usage
- Orange (`#FF6800`) is exclusively for brand/action accents
- Never use pure black (`#000000`) for text — use `endurix-black` (`#111317`)
- Dark mode text: use `#f8f9fa` (off-white), never pure white for body text
- Secondary text: `text-endurix-black/50-60` (light) or `text-muted-foreground` (dark)

### Animation
- Use Framer Motion for scroll-triggered reveals: `whileInView` + `viewport={{ once: true }}`
- Hover lift: `whileHover={{ y: -6 }}` or `y: -8`
- Staggered children: `transition={{ delay: index * 0.12 }}`
- Ease curve: `[0.22, 1, 0.36, 1]` for smooth deceleration

---

## 6. Dashboard-Specific Patterns

### Page Wrapper
```tsx
<div className="min-h-screen bg-endurix-paper dark:bg-background">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    {/* Dashboard content */}
  </div>
</div>
```

### Section Header
```tsx
<div className="mb-8">
  <span
    className="inline-block text-[10px] text-endurix-black/50 dark:text-muted-foreground
      tracking-widest mb-4"
    style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>
    SECTION EYEBROW
  </span>
  <h2
    className="font-bold text-endurix-black dark:text-foreground
      text-4xl lg:text-5xl leading-[1.05] tracking-tight uppercase"
    style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>
    Section Title
  </h2>
</div>
```

### Stat Grid
```tsx
<section className="grid grid-cols-2 lg:grid-cols-4 gap-6">
  {stats.map((stat) => (
    <article key={stat.label}
      className="border border-endurix-black/12 dark:border-border
        bg-white dark:bg-card p-4">
      {/* ...stat card pattern from above */}
    </article>
  ))}
</section>
```

### Dashboard Card with Header
```tsx
<article className="border border-endurix-black/12 dark:border-border
  bg-white dark:bg-card">
  {/* Card Header */}
  <div className="flex items-center justify-between px-4 py-2.5
    bg-endurix-paper dark:bg-muted border-b border-endurix-black/8 dark:border-border">
    <span className="text-[9px] text-endurix-black/60 dark:text-muted-foreground
      tracking-widest"
      style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>
      HEADER LABEL
    </span>
    <div className="flex items-center gap-1.5">
      <div className="w-2 h-2 rounded-full bg-endurix-orange" />
      <div className="w-2 h-2 rounded-full bg-endurix-black" />
      <div className="w-2 h-2 rounded-full bg-endurix-stone" />
    </div>
  </div>
  {/* Card Body */}
  <div className="p-6">
    {/* Content */}
  </div>
</article>
```

### Scope Toggle (Tabs)
```tsx
<div className="flex items-center gap-2 border border-endurix-black/15 dark:border-border
  bg-endurix-paper dark:bg-muted p-1">
  <button className={`px-4 py-2 text-xs font-bold tracking-widest transition-all
    ${active
      ? 'bg-endurix-black dark:bg-white text-white dark:text-endurix-black'
      : 'text-endurix-black/60 dark:text-muted-foreground hover:text-endurix-black dark:hover:text-foreground'
    }`}
    style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>
    Option A
  </button>
</div>
```

---

## 7. Quick Reference — Common Tailwind Classes

| Purpose        | Light Mode                                                       | Dark Mode                               |
|----------------|------------------------------------------------------------------|-----------------------------------------|
| Page bg        | `bg-endurix-paper`                                               | `dark:bg-background`                    |
| Card bg        | `bg-white`                                                       | `dark:bg-card`                          |
| Section bg     | `bg-muted`                                                       | `dark:bg-muted`                         |
| Card border    | `border-endurix-black/12`                                        | `dark:border-border`                    |
| Divider        | `border-endurix-black/8`                                         | `dark:border-border`                    |
| Primary text   | `text-endurix-black`                                             | `dark:text-foreground`                  |
| Secondary text | `text-endurix-black/50`                                          | `dark:text-muted-foreground`            |
| Accent         | `text-endurix-orange` / `bg-endurix-orange`                      | same                                    |
| Button primary | `bg-endurix-orange text-white`                                   | same                                    |
| Button hover   | `hover:bg-endurix-orange/90`                                     | same                                    |
| Label font     | `style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}` | same                                    |
| Headline font  | `style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}`        | same                                    |
| Ghost border   | `border-endurix-black/12`                                        | `dark:border-white/5`                   |
| Badge solid    | `bg-endurix-black text-white`                                    | `dark:bg-white dark:text-endurix-black` |
