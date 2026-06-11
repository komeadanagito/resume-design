import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import Fastify from "fastify";
import { createAnthropicAdapter } from "../src/anthropic/adapter.js";
import { ConversationOrchestrator } from "../src/conversations/orchestrator.js";
import { ConversationStore } from "../src/conversations/store.js";
import { registerConversationRoutes } from "../src/conversations/routes.js";

async function buildApp(deltas: string[]) {
  const dir = await mkdtemp(join(tmpdir(), "rs-conv-routes-"));
  const store = new ConversationStore(dir);
  const adapter = createAnthropicAdapter({
    client: {
      messages: {
        stream() {
          async function* iter() {
            for (const text of deltas) {
              yield { type: "content_block_delta", delta: { type: "text_delta", text } } as const;
            }
            yield { type: "message_stop" } as const;
          }
          return { [Symbol.asyncIterator]: () => iter() };
        }
      }
    },
    model: "claude-sonnet-4-6"
  });
  const orchestrator = new ConversationOrchestrator({ store, adapter });
  const app = Fastify({ logger: false });
  await registerConversationRoutes(app, { orchestrator, store });
  await app.ready();
  return { app, store, dir };
}

describe("conversation routes", () => {
  it("POST /messages 400s on empty text", async () => {
    const { app } = await buildApp([]);
    const response = await app.inject({
      method: "POST",
      url: "/api/conversations/proj_1/messages",
      payload: { text: "" }
    });
    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it("POST /messages 202s and queues the run", async () => {
    const { app } = await buildApp([]);
    const response = await app.inject({
      method: "POST",
      url: "/api/conversations/proj_1/messages",
      payload: { text: "Hello" }
    });
    expect(response.statusCode).toBe(202);
    expect(JSON.parse(response.body)).toEqual({ accepted: true });
    await app.close();
  });

  it("GET /stream returns SSE chunks for the queued run", async () => {
    const { app, store } = await buildApp(["Hi"]);
    await app.inject({
      method: "POST",
      url: "/api/conversations/proj_1/messages",
      payload: { text: "Hello" }
    });
    const response = await app.inject({
      method: "GET",
      url: "/api/conversations/proj_1/stream",
      headers: { accept: "text/event-stream" }
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/event-stream");
    expect(response.body).toContain("event: message_started");
    expect(response.body).toContain("event: message_delta");
    expect(response.body).toContain("event: done");

    const messages = await store.listMessages("proj_1");
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({ role: "user", content: "Hello" });
    expect(messages[1]).toMatchObject({ role: "assistant", content: "Hi" });
    await app.close();
  });

  it("GET /stream 409s when nothing is queued", async () => {
    const { app } = await buildApp([]);
    const response = await app.inject({
      method: "GET",
      url: "/api/conversations/proj_x/stream"
    });
    expect(response.statusCode).toBe(409);
    await app.close();
  });

  it("POST /cancel returns 200 even when no run is active", async () => {
    const { app } = await buildApp([]);
    const response = await app.inject({
      method: "POST",
      url: "/api/conversations/proj_1/cancel"
    });
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ cancelled: false });
    await app.close();
  });
});
