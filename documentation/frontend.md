# Frontend Architecture

## Technology Stack
- **Framework**: Next.js 14 utilizing the App Router architecture.
- **Language**: TypeScript for strict typing and better developer experience.
- **UI Library**: Custom tailored components based on Shadcn UI.
- **Styling**: Tailwind CSS v4, heavily employing CSS Variables for a dynamic theming system.
- **Internationalization**: `next-intl` is used to provide multi-language support (specifically translated to Spanish).
- **Data Visualization**: Recharts and ECharts for rich data graphs (Heart Rate, Pace, Elevation).

## Design System & Aesthetics
The frontend strictly adheres to a **"Performance Curator"** design philosophy. 

### Key Characteristics
1. **No-Line Layouts**: Avoidance of generic UI cards and hard borders. Surface hierarchy is managed entirely through tonal background shifts.
2. **Typography**: A dual-font system (e.g., Manrope for display, Inter for body) that yields an editorial, authoritative, and minimalist layout.
3. **Full-Bleed Interfaces**: Edge-to-edge layouts that remove restrictive container paddings, making data grids and tables feel immersive.
4. **Color Palette**: Sophisticated, muted tones (like muted navy) with semantic light and dark mode functionality via Tailwind theme-aware variables.
5. **Micro-Interactions**: Smooth transitions, hover effects, and Framer Motion integration to make the UI feel reactive and alive.

## Application Structure
- `src/app/(dashboard)/`: Contains the authenticated routes for both athletes and coaches. Layouts dynamically adapt based on the user's role.
- `src/components/`: Reusable, atomic UI components (buttons, dialogs, charts) that embody the design system.
- `src/lib/`: Shared utilities, including formatting functions, design token helpers, and generic types.
- `src/messages/`: JSON translation files (e.g., `es.json`) used by `next-intl` to localize the application strings.

## State Management and Data Fetching
- **Client-Side Auth**: Managed via Supabase Auth helpers (`@supabase/ssr`). The user's session is validated and injected into the component tree.
- **Data Fetching**: The frontend fetches data securely via **Supabase Client**, utilizing Row Level Security (RLS) to ensure users only see data they are permitted to see. Direct database queries from Server Components streamline the data flow and avoid redundant API boilerplate.
- **Forms and Validation**: `react-hook-form` paired with `zod` schema validation for robust client-side form handling and error reporting.

## Key Frontend Modules
- **Calendar & Assignments**: Complex grids for managing and viewing scheduled workouts.
- **Workout Builder**: An interactive UI for combining "blocks" of exercises (warmup, intervals, cooldown) to form a complete training session.
- **Activity Analysis**: Deep-dive views of individual running activities, rendering map routes and overlapping telemetry charts.
