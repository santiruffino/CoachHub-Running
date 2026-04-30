# i18n Audit

Date: 2026-04-30

## Summary

The platform has `next-intl` integration with `es` locale, but translation coverage is incomplete.

## Main issues

1. Many API routes return hardcoded user-facing strings.
2. Several dashboard pages/components still contain hardcoded copy.
3. Some translation key usages appear missing or inconsistent by namespace.

## High-priority remediation

- Move API responses toward stable error codes.
- Map codes to localized strings in frontend.
- Eliminate hardcoded UI literals in top user flows:
  - athlete detail
  - profile
  - calendar dashboard dialogs
  - invitation flows

## Validation checklist

- no raw backend error text shown directly to users in critical flows
- no new hardcoded user-facing strings in changed files
- key existence checks for all `t('...')` usage paths

See `documentation/platform-analysis-report.md` for findings context.
