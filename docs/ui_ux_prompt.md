# Prompt Context - UI/UX

Use this context for UI generation aligned with the current product.

## Visual direction

- Preserve the established dashboard design language
- Prioritize clarity for data-dense coaching workflows
- Keep motion and effects subtle and purposeful

## Product context

- Running-first experience today
- Cycling features should integrate without breaking running UX

## Implementation constraints

- Use existing component primitives in `src/components/ui/**`
- Avoid introducing incompatible design systems or token sets
- Keep layouts responsive and scannable on desktop/mobile

## i18n and copy

- Do not hardcode user-facing copy in new UI
- Use translation keys and existing locale structure (`messages/es.json`)
