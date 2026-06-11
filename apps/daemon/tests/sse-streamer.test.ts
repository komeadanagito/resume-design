import { afterEach, describe, expect, it, vi } from "vitest";
import type { SseEvent } from "@resume-studio/contracts";
import { runSseStream, type SseRaw } from "../src/sse/streamer.js";

function makeFakeReply() {
  const chunks: string[] = [];
  let ended = false;
  const headers: Record<string, string> = {};
  const raw: SseRaw = {
    writeHead(_status: number, h?: unknown) {
      Object.assign(headers, h ?? {});
      return raw as never;
    },
    write(chunk: unknown) {
      chunks.push(String(chunk));
      return true;
    },
    end() {
      ended = true;
      return raw as never;
    },
    on() {
      return raw as never;
    }
  };
  return { chunks, isEnded: () => ended, raw, headers };
}

describe("runSseStream", () => {
  afterEach(() => vi.useRealTimers());

  it("writes the SSE preamble and each event in order, then ends", async () => {
    const reply = makeFakeReply();
    async function* events(): AsyncGenerator<SseEvent> {
      yield { type: "message_started", id: "m1", role: "assistant" };
      yield { type: "message_delta", id: "m1", delta: "Hi" };
      yield { type: "done", durationMs: 1 };
    }

    await runSseStream(reply.raw, events(), { heartbeatMs: 0 });

    expect(reply.chunks[0]).toContain("event: message_started");
    expect(reply.chunks[1]).toContain("event: message_delta");
    expect(reply.chunks[2]).toContain("event: done");
    expect(reply.isEnded()).toBe(true);
  });

  it("emits a heartbeat tick between slow events", async () => {
    vi.useFakeTimers();
    const reply = makeFakeReply();

    async function* slowEvents(): AsyncGenerator<SseEvent> {
      yield { type: "message_started", id: "m1", role: "assistant" };
      await new Promise((resolve) => setTimeout(resolve, 100));
      yield { type: "done", durationMs: 100 };
    }

    const promise = runSseStream(reply.raw, slowEvents(), { heartbeatMs: 30 });
    await vi.advanceTimersByTimeAsync(150);
    await promise;

    const heartbeats = reply.chunks.filter((c) => c.startsWith(": ping"));
    expect(heartbeats.length).toBeGreaterThanOrEqual(2);
  });
});
