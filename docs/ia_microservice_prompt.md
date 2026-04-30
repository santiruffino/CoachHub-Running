# AI Service Prompt Context (Future)

This repository does not currently include an active AI microservice runtime.

Use this as a forward-looking contract for future implementation.

## Candidate capabilities

- training generation assistance
- activity analysis summaries
- race-time prediction helpers

## Integration contract

- external service called from Next.js route handlers
- authenticated internal token exchange
- explicit request/response schemas and versioned endpoints

## Safety requirements

- no direct DB superuser access from AI service
- deterministic fallback when AI service is unavailable
- auditable prompt and output logging (without sensitive user secrets)

## Scope rule

AI service remains out of current MVP-critical path.
