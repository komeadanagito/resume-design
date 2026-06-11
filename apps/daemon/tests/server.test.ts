import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { createServer } from "../src/server.js";

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await import("node:fs/promises").then((fs) => fs.rm(root, { recursive: true, force: true }));
  }
});

async function fixtureRoot() {
  const root = await mkdtemp(join(tmpdir(), "resume-daemon-"));
  roots.push(root);

  await mkdir(join(root, "skills", "resume-modern-tech"), { recursive: true });
  await writeFile(
    join(root, "skills", "resume-modern-tech", "SKILL.md"),
    `---
name: resume-modern-tech
description: Modern tech resume
version: 1.0.0
rs:
  industry: [tech]
  ats_target: high
preview:
  type: html
---

# Resume Modern Tech

Use crisp sections and measurable impact.
`
  );

  await mkdir(join(root, "design-systems", "neutral-modern"), { recursive: true });
  await writeFile(
    join(root, "design-systems", "neutral-modern", "DESIGN.md"),
    `---
name: neutral-modern
description: Neutral modern resume system
palette:
  primary: "#2563EB"
  ink: "#111827"
industries: [tech]
---

# Neutral Modern

Readable, restrained, and ATS friendly.
`
  );

  return root;
}

describe("daemon server", () => {
  it("returns health with indexed counts", async () => {
    const root = await fixtureRoot();
    const server = await createServer({ rootDir: root, dataDir: join(root, "data") });

    const response = await server.inject({ method: "GET", url: "/api/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "ok",
      skills: 1,
      designSystems: 1
    });
  });

  it("lists and reads skills", async () => {
    const root = await fixtureRoot();
    const server = await createServer({ rootDir: root, dataDir: join(root, "data") });

    const list = await server.inject({ method: "GET", url: "/api/skills" });
    expect(list.statusCode).toBe(200);
    expect(list.json()).toMatchObject([{ id: "resume-modern-tech", name: "resume-modern-tech" }]);

    const detail = await server.inject({ method: "GET", url: "/api/skills/resume-modern-tech" });
    expect(detail.statusCode).toBe(200);
    expect(detail.json().body).toContain("measurable impact");
  });

  it("lists and reads design systems", async () => {
    const root = await fixtureRoot();
    const server = await createServer({ rootDir: root, dataDir: join(root, "data") });

    const list = await server.inject({ method: "GET", url: "/api/design-systems" });
    expect(list.statusCode).toBe(200);
    expect(list.json()).toMatchObject([{ id: "neutral-modern", name: "neutral-modern" }]);

    const detail = await server.inject({ method: "GET", url: "/api/design-systems/neutral-modern" });
    expect(detail.statusCode).toBe(200);
    expect(detail.json().body).toContain("ATS friendly");
  });

  it("maps missing content to app errors", async () => {
    const root = await fixtureRoot();
    const server = await createServer({ rootDir: root, dataDir: join(root, "data") });

    const response = await server.inject({ method: "GET", url: "/api/skills/missing" });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: "not_found", retry: false });
  });

  it("exposes conversation routes", async () => {
    const root = await fixtureRoot();
    const server = await createServer({ rootDir: root, dataDir: join(root, "data") });

    const response = await server.inject({ method: "POST", url: "/api/conversations/proj_1/cancel" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ cancelled: false });
    await server.close();
  });

  it("reports byokProviders=1 when an API key is provided", async () => {
    const root = await fixtureRoot();
    const server = await createServer({
      rootDir: root,
      dataDir: join(root, "data"),
      anthropicApiKey: "sk-test"
    });

    const response = await server.inject({ method: "GET", url: "/api/health" });
    expect(response.json().agents).toEqual({ cliCount: 0, byokProviders: 1 });
    await server.close();
  });
});
