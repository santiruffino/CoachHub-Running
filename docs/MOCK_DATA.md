# Mock Data Policy

This repository should not include reusable real-like credentials or shared default passwords in docs.

## Safe mock data guidelines

- Use placeholder emails (example domains only)
- Do not publish fixed plaintext passwords
- Do not include tokens/keys in docs

## Suggested local fixture format

| Role | Email | Name | Notes |
|---|---|---|---|
| ADMIN | `admin+local@example.com` | Local Admin | Set password locally at creation time |
| COACH | `coach+local@example.com` | Local Coach | Set password locally at creation time |
| ATHLETE | `athlete+local@example.com` | Local Athlete | Set password locally at creation time |

## Preferred setup path

- Use scripts:
  - `scripts/create-admin.ts`
  - `scripts/create-coach.ts`
- Or create users in Supabase dashboard for local testing.
