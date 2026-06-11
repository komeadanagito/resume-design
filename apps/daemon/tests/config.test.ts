import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import Fastify from "fastify";
import { ConfigStore } from "../src/config/store.js";
import { registerConfigRoutes } from "../src/config/routes.js";

async function makeStore() {
  const dir = await mkdtemp(join(tmpdir(), "rs-config-"));
  return new ConfigStore(dir);
}

describe("ConfigStore", () => {
  it("returns defaults when no file exists", async () => {
    const store = await makeStore();
    const config = await store.get();
    expect(config.anthropicApiKey).toBe("");
    expect(config.anthropicModel).toBe("claude-sonnet-4-6");
  });

  it("persists api key and model", async () => {
    const store = await makeStore();
    await store.update({ anthropicApiKey: "sk-ant-test1234", anthropicModel: "claude-opus-4-8" });
    const config = await store.get();
    expect(config.anthropicApiKey).toBe("sk-ant-test1234");
    expect(config.anthropicModel).toBe("claude-opus-4-8");
  });

  it("merges partial updates", async () => {
    const store = await makeStore();
    await store.update({ anthropicApiKey: "sk-ant-abcd9999" });
    await store.update({ anthropicModel: "claude-opus-4-8" });
    const config = await store.get();
    expect(config.anthropicApiKey).toBe("sk-ant-abcd9999");
    expect(config.anthropicModel).toBe("claude-opus-4-8");
  });
});

describe("config routes", () => {
  async function buildApp() {
    const store = await makeStore();
    const app = Fastify({ logger: false });
    await registerConfigRoutes(app, { store });
    await app.ready();
    return { app, store };
  }

  it("GET /api/config redacts the api key", async () => {
    const { app, store } = await buildApp();
    await store.update({ anthropicApiKey: "sk-ant-secret-tail" });

    const response = await app.inject({ method: "GET", url: "/api/config" });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.hasApiKey).toBe(true);
    expect(body.apiKeyLast4).toBe("tail");
    expect(JSON.stringify(body)).not.toContain("secret");
    await app.close();
  });

  it("PUT /api/config stores key and model", async () => {
    const { app, store } = await buildApp();
    const response = await app.inject({
      method: "PUT",
      url: "/api/config",
      payload: { apiKey: "sk-ant-new-key-abcd", model: "claude-opus-4-8" }
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ hasApiKey: true, apiKeyLast4: "abcd", model: "claude-opus-4-8" });

    const stored = await store.get();
    expect(stored.anthropicApiKey).toBe("sk-ant-new-key-abcd");
    await app.close();
  });

  it("PUT /api/config rejects empty payloads", async () => {
    const { app } = await buildApp();
    const response = await app.inject({ method: "PUT", url: "/api/config", payload: {} });
    expect(response.statusCode).toBe(400);
    await app.close();
  });
});
