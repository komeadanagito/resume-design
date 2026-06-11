import { describe, expect, it } from "vitest";
import { createAnthropicAdapter } from "../src/anthropic/adapter.js";
import type { AnthropicLikeClient } from "../src/anthropic/types.js";

function mockClient(deltas: string[]): AnthropicLikeClient {
  return {
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
  };
}

describe("createAnthropicAdapter", () => {
  it("yields message_started, deltas, message_completed, done in order", async () => {
    const adapter = createAnthropicAdapter({
      client: mockClient(["Hello", ", ", "world"]),
      model: "claude-sonnet-4-6"
    });

    const events = [];
    for await (const event of adapter.run({
      messages: [{ role: "user", content: "Hi" }],
      abortSignal: new AbortController().signal
    })) {
      events.push(event);
    }

    expect(events[0]).toMatchObject({ type: "message_started", role: "assistant" });
    expect(
      events.filter((e) => e.type === "message_delta").map((e) => (e as { delta: string }).delta)
    ).toEqual(["Hello", ", ", "world"]);
    expect(events.at(-2)).toMatchObject({ type: "message_completed" });
    expect(events.at(-1)).toMatchObject({ type: "done" });
  });

  it("emits a single error event when the SDK throws", async () => {
    const adapter = createAnthropicAdapter({
      client: {
        messages: {
          stream() {
            throw new Error("rate limited");
          }
        }
      },
      model: "claude-sonnet-4-6"
    });

    const events = [];
    for await (const event of adapter.run({
      messages: [{ role: "user", content: "Hi" }],
      abortSignal: new AbortController().signal
    })) {
      events.push(event);
    }

    expect(events.filter((e) => e.type === "error")).toHaveLength(1);
    expect(events.at(-1)).toMatchObject({ type: "error", code: "agent_failed" });
  });

  it("stops emitting deltas once abortSignal fires", async () => {
    const controller = new AbortController();
    const adapter = createAnthropicAdapter({
      client: mockClient(["a", "b", "c", "d"]),
      model: "claude-sonnet-4-6"
    });

    const events = [];
    let count = 0;
    for await (const event of adapter.run({
      messages: [{ role: "user", content: "Hi" }],
      abortSignal: controller.signal
    })) {
      events.push(event);
      if (event.type === "message_delta") {
        count += 1;
        if (count === 2) controller.abort();
      }
    }

    expect(events.some((e) => e.type === "error" && (e as { code: string }).code === "cancelled")).toBe(true);
    expect(events.filter((e) => e.type === "message_delta").length).toBeLessThan(4);
  });
});
