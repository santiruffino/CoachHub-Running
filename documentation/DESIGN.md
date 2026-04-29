# Design System Strategy: High-End Endurance Coaching (Desktop)

## 1. Overview & Creative North Star
**The Creative North Star: "The Performance Curator"**

This design system moves away from the aggressive, high-contrast "neon-and-black" aesthetic common in fitness apps. Instead, it adopts the persona of a high-end endurance coach: calm, authoritative, and meticulously organized. The goal is to create a digital environment that feels like a premium athletic journal or a high-end editorial spread.

To achieve this, the system breaks the "standard grid" through **intentional asymmetry** and **breathable white space**. We prioritize "The Performance Curator" aesthetic by using massive display typography paired with extremely delicate structural elements. This creates a sense of luxury and focus, ensuring the athlete feels a sense of mental clarity when reviewing their data.

---

## 2. Colors & Surface Philosophy
The palette is rooted in a "New Neutral" philosophy—using temperature and tone rather than saturation to guide the eye.

### Color Palette Reference
*   **Primary (Muted Navy/Charcoal):** `#4e6073` (Primary), `#d1e4fb` (Container).
*   **Neutrals:** `#f8f9fa` (Surface/Background), `#2b3437` (On-Surface/Text).
*   **Accents:** Subtle use of Tertiary `#575e78` for secondary data points.

### The "No-Line" Rule
To maintain an editorial feel, **1px solid borders are prohibited for sectioning.** We define boundaries through background color shifts.
*   **Application:** Place a `surface-container-low` (`#f1f4f6`) section directly against the `surface` background (`#f8f9fa`). The 2% shift in brightness is enough to define a zone without "trapping" the content in a box.

### Surface Hierarchy & Nesting
Treat the UI as a series of stacked, fine-paper layers. 
*   **Base:** `surface` (`#f8f9fa`).
*   **Secondary Content Zones:** `surface-container-low` (`#f1f4f6`).
*   **Interactive Cards:** `surface-container-lowest` (`#ffffff`) to create a natural "pop" against the off-white background.

### Glass & Signature Textures
For floating navigation or metric overlays, use **Glassmorphism**. Apply `surface_container_lowest` at 80% opacity with a `20px` backdrop-blur. 
*   **Signature Gradient:** For primary CTAs (e.g., "Start Workout"), use a subtle linear gradient from `primary` (`#4e6073`) to `primary_dim` (`#425467`). This adds a "soul" and depth that prevents the UI from feeling flat or clinical.

### Dark Mode Philosophy & Adaptation
Dark mode should NOT be pure `#000000`. It must retain the authoritative, customized luxury feel of the light mode while preventing high-contrast eye strain.
*   **Base (Surface):** `dark:bg-[#0a0f14]` (Deep slate/navy, equivalent to `hsl(210, 33%, 6%)`).
*   **Secondary Content Zones:** `dark:bg-[#131b23]`.
*   **Interactive Cards:** `dark:bg-[#1a232c]`.
*   **Text (On-Surface):** Instead of pure white, use soft off-whites like `#f8f9fa` (matching light mode base) for primary text, and `#8b9bb4` for secondary/tertiary text.
*   **The "Dark Glow" Border:** In dark mode, ambient box shadows become invisible. To recreate the "soft lift" depth effect, apply a delicate translucent inner border (e.g., `dark:border-white/5`) exclusively to interactive cards and containers instead of heavy outlines.

---

## 3. Typography
The typography system uses a dual-font approach to balance athletic performance (Manrope) with editorial readability (Inter).

*   **Display & Headlines (Manrope):** These are your "Editorial Anchors." Use `display-lg` (3.5rem) with `-0.02em` letter spacing for hero metrics (e.g., Weekly Mileage).
*   **Titles & Body (Inter):** Inter provides a technical, clean feel. Increase letter spacing by `0.01em` on `body-md` to enhance the spacious, high-end feel.
*   **Labels (Inter All-Caps):** Use `label-md` or `label-sm` in all-caps with `0.05em` tracking for category headers (e.g., "HEART RATE ZONE"). This adds an authoritative, "spec-sheet" aesthetic.

---

## 4. Elevation & Depth
Depth in this system is organic and atmospheric, not structural.

*   **The Layering Principle:** Avoid shadows for static cards. Instead, nest a `surface-container-lowest` card inside a `surface-container-low` section. This creates a "soft lift."
*   **Ambient Shadows:** For active elements (hovered cards or modals), use an "Extra-Diffused" shadow:
    *   `box-shadow: 0 20px 40px rgba(43, 52, 55, 0.05);` (Using a 5% opacity of the `on-surface` color).
*   **The Ghost Border:** If a border is required for accessibility, use `outline-variant` (`#abb3b7`) at **15% opacity**. It should be felt, not seen.

---

## 5. Components

### Buttons
*   **Primary:** `primary` background with `on_primary` text. No border. `md` (0.375rem) corner radius.
*   **Secondary:** `surface-container-highest` background. No border.
*   **Tertiary (Editorial Link):** Text-only using `primary` color, with a 1px underline offset by `4px`.

### Cards & Lists
*   **Rule:** Forbid the use of divider lines.
*   **Separation:** Use `spacing-8` (2.75rem) of vertical white space to separate list items, or alternating background tints (`surface` to `surface-container-low`).
*   **Endurance Metrics Card:** Use `surface-container-lowest` with a "Ghost Border" and `padding-6`.

### Input Fields
*   **Style:** Minimalist. No background fill. Only a bottom border using `outline-variant` at 30% opacity.
*   **Focus State:** Transition the bottom border to `primary` and add a subtle `primary-container` glow (blur 4px).

### Endurance-Specific Components
*   **The "Split-View" Data Table:** Instead of a traditional grid, use a two-column asymmetrical layout. Large-scale typography for primary metrics on the left, and micro-labels for secondary data on the right.
*   **Progress Rings:** Use `primary` for the active path and `surface-variant` for the track. Keep the stroke weight thin (e.g., 2px-4px) to maintain the "light" editorial feel.

---

## 6. Do’s and Don’ts

### Do:
*   **Embrace Asymmetry:** Align text to the left but allow imagery or large metrics to bleed into the right-side gutters.
*   **Use Generous Padding:** When in doubt, increase padding. Use `spacing-12` (4rem) for section margins.
*   **Color as Information:** Use the `primary` navy strictly for interactive elements or active status indicators.

### Don't:
*   **Don't use pure black:** It is too harsh. Always use `on-surface` (`#2b3437`) for text.
*   **Don't use heavy drop shadows:** This ruins the "fine paper" aesthetic. Keep elevations tonal.
*   **Don't crowd the data:** If a screen feels busy, remove borders and increase white space before reducing font size.