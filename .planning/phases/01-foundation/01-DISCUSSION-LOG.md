# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-14
**Phase:** 01-foundation
**Areas discussed:** Module structure, Password protection, Testing strategy, Color token naming

---

## Module Structure

### File Organization

| Option | Description | Selected |
|--------|-------------|----------|
| Feature-based (Recommended) | Group by feature: src/features/dashboard/, src/features/detail/, etc. Shared code in src/shared/. Scales well as Phase 3 adds admin/billing features. | ✓ |
| Flat by type | Classic split: src/components/, src/hooks/, src/utils/, src/services/. Simpler for a small team. | |
| Hybrid | Start flat but use subfolders within components for related groups (charts/, modals/, views/). | |

**User's choice:** Feature-based
**Notes:** None

### Component Granularity

| Option | Description | Selected |
|--------|-------------|----------|
| Every component = own file (Recommended) | Even small components like Card, StatCard get their own file. Consistent, easy to find. Results in ~20-25 files. | ✓ |
| Group small components | Tiny components stay grouped in a shared ui.jsx. Only components >50 lines get their own file. | |
| You decide | Claude uses best judgment based on size and reuse patterns. | |

**User's choice:** Every component = own file
**Notes:** None

### Constants Organization

| Option | Description | Selected |
|--------|-------------|----------|
| Separate files | src/shared/constants/colors.js, src/shared/constants/logos.jsx | |
| Single constants file | src/shared/constants/index.js with all constants together | |
| You decide | Claude decides based on what makes sense for each constant type | ✓ |

**User's choice:** You decide (Claude's discretion)
**Notes:** None

---

## Password Protection

### Auth Type

| Option | Description | Selected |
|--------|-------------|----------|
| Shared password (Recommended) | Single password shared among ~6 management users. Simple login screen, no user accounts. | ✓ |
| Vercel edge middleware | Password check at the edge before page loads. More secure but requires Vercel Pro or custom approach. | |
| Supabase Auth | Built-in auth with per-user accounts. Heavier setup, ties Phase 1 to Phase 2 dependency. | |

**User's choice:** Shared password
**Notes:** None

### Verification Method

| Option | Description | Selected |
|--------|-------------|----------|
| Env var + client hash (Recommended) | Store hashed password in Vercel env var. Client hashes input with SHA-256 and compares. Session via sessionStorage. | ✓ |
| Vercel serverless API route | Password verified server-side via /api/auth endpoint with httpOnly cookie. More secure but adds serverless dependency. | |
| You decide | Claude picks the best approach for "simple password protection". | |

**User's choice:** Env var + client hash
**Notes:** None

---

## Testing Strategy

### Test Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Unit tests only (Recommended) | Vitest unit tests for pure functions: parseCSV, getWeekNumber, data aggregation, classification logic. Fast, no DOM dependency. | ✓ |
| Unit + component tests | Unit tests PLUS React Testing Library tests for key components. More confidence but significantly more work. | |
| Unit + E2E smoke | Unit tests PLUS a single Playwright E2E test. Catches integration issues unit tests miss. | |

**User's choice:** Unit tests only
**Notes:** None

### CI Setup

| Option | Description | Selected |
|--------|-------------|----------|
| GitHub Actions CI (Recommended) | Simple workflow that runs Vitest on push/PR. Satisfies success criterion #5. | ✓ |
| Vercel build step | Run tests as part of Vercel build command. No separate CI config but slower deploys. | |
| You decide | Claude picks the CI approach that best satisfies success criterion #5. | |

**User's choice:** GitHub Actions CI
**Notes:** None

---

## Color Token Naming

### Token Convention

| Option | Description | Selected |
|--------|-------------|----------|
| Semantic names (Recommended) | Name by purpose: brand-bg, brand-primary, brand-secondary, brand-accent. Charts use chart-1, chart-2. | |
| Descriptive names | Name by appearance: switch-green-light, switch-green, switch-green-dark, switch-purple. | |
| You decide | Claude picks a naming convention balancing readability and maintainability. | ✓ |

**User's choice:** You decide (Claude's discretion)
**Notes:** None

---

## Claude's Discretion

- Constants organization (separate files vs single file per type)
- Color token naming convention (semantic vs descriptive)

## Deferred Ideas

None — discussion stayed within phase scope
