import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { createServer } from "../src/server.js";

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

async function serverWithTempData() {
  const root = await mkdtemp(join(tmpdir(), "resume-projects-"));
  roots.push(root);
  return createServer({ rootDir: root, dataDir: join(root, "data") });
}

describe("project routes", () => {
  it("creates and lists projects", async () => {
    const server = await serverWithTempData();

    const created = await server.inject({
      method: "POST",
      url: "/api/projects",
      payload: { name: "My Resume", locale: "zh-CN", designSystemId: "neutral-modern" }
    });

    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      name: "My Resume",
      locale: "zh-CN",
      designSystemId: "neutral-modern"
    });

    const list = await server.inject({ method: "GET", url: "/api/projects" });
    expect(list.statusCode).toBe(200);
    expect(list.json()).toHaveLength(1);
    expect(list.json()[0].id).toBe(created.json().id);
  });

  it("reads, patches, duplicates, deletes, and bootstraps project state", async () => {
    const server = await serverWithTempData();

    const created = await server.inject({
      method: "POST",
      url: "/api/projects",
      payload: { name: "Source Resume", locale: "en-US" }
    });
    const projectId = created.json().id;

    const read = await server.inject({ method: "GET", url: `/api/projects/${projectId}` });
    expect(read.statusCode).toBe(200);
    expect(read.json().name).toBe("Source Resume");

    const patched = await server.inject({
      method: "PATCH",
      url: `/api/projects/${projectId}`,
      payload: { name: "Updated Resume", locale: "zh-CN" }
    });
    expect(patched.statusCode).toBe(200);
    expect(patched.json()).toMatchObject({ name: "Updated Resume", locale: "zh-CN" });

    const state = await server.inject({ method: "GET", url: `/api/projects/${projectId}/state` });
    expect(state.statusCode).toBe(200);
    expect(state.json()).toMatchObject({
      project: { id: projectId, name: "Updated Resume" },
      messages: [],
      artifacts: []
    });

    const duplicate = await server.inject({ method: "POST", url: `/api/projects/${projectId}/duplicate` });
    expect(duplicate.statusCode).toBe(201);
    expect(duplicate.json().id).not.toBe(projectId);
    expect(duplicate.json().name).toBe("Updated Resume Copy");

    const deleted = await server.inject({ method: "DELETE", url: `/api/projects/${projectId}` });
    expect(deleted.statusCode).toBe(204);

    const missing = await server.inject({ method: "GET", url: `/api/projects/${projectId}` });
    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toMatchObject({ code: "not_found" });
  });

  it("rejects invalid project payloads", async () => {
    const server = await serverWithTempData();

    const response = await server.inject({
      method: "POST",
      url: "/api/projects",
      payload: { name: "", locale: "fr-FR" }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: "validation_failed", retry: false });
  });
});
