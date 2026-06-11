import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ConversationStore } from "../src/conversations/store.js";
import { ConversationOrchestrator } from "../src/conversations/orchestrator.js";
import { createAnthropicAdapter } from "../src/anthropic/adapter.js";

async function makeStore() {
  const dir = await mkdtemp(join(tmpdir(), "rs-conv-"));
  return { store: new ConversationStore(dir), dir };
}

describe("ConversationStore", () => {
  it("returns an empty conversation for a project with no history", async () => {
    const { store } = await makeStore();
    const messages = await store.listMessages("proj_1");
    expect(messages).toEqual([]);
  });

  it("appends user and assistant messages in order", async () => {
    const { store } = await makeStore();
    const userMsg = await store.append("proj_1", { role: "user", content: "Hello" });
    const asstMsg = await store.append("proj_1", { role: "assistant", content: "Hi" });

    const messages = await store.listMessages("proj_1");
    expect(messages).toHaveLength(2);
    expect(messages[0].id).toBe(userMsg.id);
    expect(messages[1].id).toBe(asstMsg.id);
    expect(messages[0].role).toBe("user");
    expect(messages[1].role).toBe("assistant");
  });

  it("isolates messages per project", async () => {
    const { store } = await makeStore();
    await store.append("proj_a", { role: "user", content: "A" });
    await store.append("proj_b", { role: "user", content: "B" });

    expect(await store.listMessages("proj_a")).toHaveLength(1);
    expect(await store.listMessages("proj_b")).toHaveLength(1);
    expect((await store.listMessages("proj_a"))[0].content).toBe("A");
  });
});

describe("ConversationOrchestrator", () => {
  it("persists user message then streams assistant deltas", async () => {
    const { store } = await makeStore();
    const adapter = createAnthropicAdapter({
      client: {
        messages: {
          stream() {
            async function* iter() {
              yield { type: "content_block_delta", delta: { type: "text_delta", text: "Hi" } } as const;
              yield { type: "message_stop" } as const;
            }
            return { [Symbol.asyncIterator]: () => iter() };
          }
        }
      },
      model: "claude-sonnet-4-6"
    });
    const orch = new ConversationOrchestrator({ store, adapter });

    const events = [];
    for await (const event of orch.runOnce("proj_1", { text: "Hello" })) {
      events.push(event);
    }

    expect(events[0]).toMatchObject({ type: "message_started" });
    expect(events.some((e) => e.type === "message_delta")).toBe(true);
    expect(events.at(-1)).toMatchObject({ type: "done" });

    const messages = await store.listMessages("proj_1");
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({ role: "user", content: "Hello" });
    expect(messages[1]).toMatchObject({ role: "assistant", content: "Hi" });
  });

  it("cancel() returns false when no run is inflight", async () => {
    const { store } = await makeStore();
    const adapter = createAnthropicAdapter({
      client: { messages: { stream: () => ({ [Symbol.asyncIterator]: async function* () {} as never }) } },
      model: "claude-sonnet-4-6"
    });
    const orch = new ConversationOrchestrator({ store, adapter });
    expect(orch.cancel("proj_1")).toBe(false);
  });
});
