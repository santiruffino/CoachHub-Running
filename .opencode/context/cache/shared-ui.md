# Shared UI / platform domain

## Description
Reusable UI primitives, layout shells, global providers, and app-wide helpers.

## Entry points
- `src/app/layout.tsx`
- `src/app/providers.tsx`
- `src/components/ui/*`
- `src/components/layout/*`
- `src/components/dashboard/*`

## Key files
- `src/components/ui/button.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/dropdown-menu.tsx`
- `src/components/ui/table.tsx`
- `src/components/ui/form.tsx`
- `src/components/layout/Navbar.tsx`
- `src/components/layout/BottomNav.tsx`
- `src/components/dashboard/SectionHeader.tsx`

## Dependencies
- `next-themes`, `next-intl`, Radix UI, Tailwind merge helpers
- Global auth provider and cache provider
- Font setup in root layout

## Notes
- Shared UI is heavily reused by every domain.
- `BackButton`, `ThemeToggle`, and `DashboardCard*` are common composition points.
