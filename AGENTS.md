# Global AI Rules

## Context Usage (MANDATORY)

1. ALWAYS check cache first:
   .opencode/context/cache/

2. IF cache is not enough:
   use CodeGraph to discover:
   - relevant files
   - symbols
   - dependencies

3. ONLY THEN read files

---

## File Reading Rules

- Never read more than 5–10 files
- Never explore the repo blindly
- Prefer specific files over directories

---

## Goal

Minimize token usage and maximize precision.
