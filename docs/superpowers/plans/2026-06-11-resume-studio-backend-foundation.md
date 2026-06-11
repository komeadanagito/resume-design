# Resume Studio Backend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first runnable Node daemon slice for Resume Studio with shared contracts, health, skill/design-system indexing, and project CRUD.

**Architecture:** Add a root pnpm workspace with `packages/contracts` as the shared API type package and `apps/daemon` as a Fastify server. Keep storage behind a small repository interface so SQLite can replace the initial JSON store without changing routes.

**Tech Stack:** TypeScript, Fastify, Zod, Vitest, tsx, pnpm workspace.

---

### Task 1: Workspace And Contracts

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `packages/contracts/package.json`
- Create: `packages/contracts/tsconfig.json`
- Create: `packages/contracts/src/index.ts`
- Test: `packages/contracts/tests/contracts.test.ts`

- [x] **Step 1: Write failing contract tests**

```ts
import { describe, expect, it } from "vitest";
import { AppErrorSchema, ProjectSchema, SseEventSchema } from "../src/index.js";

describe("contracts", () => {
  it("validates project summaries", () => {
    const parsed = ProjectSchema.parse({
      id: "proj_1",
      name: "Backend Resume",
      locale: "en-US",
      designSystemId: "neutral-modern",
      createdAt: "2026-06-11T00:00:00.000Z",
      updatedAt: "2026-06-11T00:00:00.000Z",
    });

    expect(parsed.name).toBe("Backend Resume");
  });

  it("validates SSE event variants", () => {
    expect(SseEventSchema.parse({ type: "done", durationMs: 7 }).type).toBe("done");
    expect(() => SseEventSchema.parse({ type: "done", durationMs: -1 })).toThrow();
  });

  it("validates app errors", () => {
    expect(AppErrorSchema.parse({ code: "not_found", message: "Missing", retry: false }).code).toBe("not_found");
  });
});
```

- [x] **Step 2: Run contracts test to verify it fails**

Run: `pnpm --filter @resume-studio/contracts test`
Expected: FAIL because package and schemas do not exist.

- [x] **Step 3: Implement contracts package**

Define Zod schemas and inferred TypeScript types for errors, agents, projects, skills, design systems, human-loop cards, artifacts, and SSE events.

- [x] **Step 4: Run contracts test to verify it passes**

Run: `pnpm --filter @resume-studio/contracts test`
Expected: PASS.

### Task 2: Daemon Health And Indexing

**Files:**
- Create: `apps/daemon/package.json`
- Create: `apps/daemon/tsconfig.json`
- Create: `apps/daemon/src/env.ts`
- Create: `apps/daemon/src/content-index.ts`
- Create: `apps/daemon/src/server.ts`
- Create: `apps/daemon/src/main.ts`
- Test: `apps/daemon/tests/server.test.ts`
- Create sample content under `skills/resume-modern-tech/SKILL.md` and `design-systems/neutral-modern/DESIGN.md`

- [x] **Step 1: Write failing daemon tests**

Test `GET /api/health`, `GET /api/skills`, `GET /api/skills/:id`, `GET /api/design-systems`, and `GET /api/design-systems/:id` through Fastify injection.

- [x] **Step 2: Run daemon test to verify it fails**

Run: `pnpm --filter @resume-studio/daemon test`
Expected: FAIL because server and indexers do not exist.

- [x] **Step 3: Implement daemon server and markdown frontmatter scanner**

Use a small local frontmatter parser, Zod validation via contracts, and route-level error mapping.

- [x] **Step 4: Run daemon test to verify it passes**

Run: `pnpm --filter @resume-studio/daemon test`
Expected: PASS.

### Task 3: Project JSON Store

**Files:**
- Create: `apps/daemon/src/projects/store.ts`
- Create: `apps/daemon/src/projects/routes.ts`
- Modify: `apps/daemon/src/server.ts`
- Test: `apps/daemon/tests/projects.test.ts`

- [x] **Step 1: Write failing project API tests**

Test project list, create, get, patch, duplicate, delete, and state bootstrap.

- [x] **Step 2: Run project tests to verify they fail**

Run: `pnpm --filter @resume-studio/daemon test -- projects`
Expected: FAIL because project routes do not exist.

- [x] **Step 3: Implement JSON-backed project repository**

Persist to `<dataDir>/projects.json` using atomic write through a temporary file and rename.

- [x] **Step 4: Run project tests to verify they pass**

Run: `pnpm --filter @resume-studio/daemon test -- projects`
Expected: PASS.

### Task 4: Final Verification

- [x] Run `pnpm test`.
- [x] Run `pnpm typecheck`.
- [x] Run `git status --short` and report changed files.
