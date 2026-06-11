import { afterEach, describe, expect, it, vi } from "vitest";
import type { SseEvent } from "@resume-studio/contracts";
import { subscribeToConversation } from "@/runtime/sse-client";

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  url: string;
  withCredentials = false;
  readyState = 0;
  onopen: ((ev: unknown) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  private listeners = new Map<string, Set<(ev: MessageEvent) => void>>();

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (ev: MessageEvent) => void) {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(listener);
  }

  removeEventListener(type: string, listener: (ev: MessageEvent) => void) {
    this.listeners.get(type)?.delete(listener);
  }

  close() {
    this.readyState = 2;
  }

  emit(type: string, data: unknown) {
    const ev = new MessageEvent(type, { data: JSON.stringify(data) });
    this.listeners.get(type)?.forEach((l) => l(ev));
  }
}

describe("subscribeToConversation", () => {
  afterEach(() => {
    FakeEventSource.instances = [];
    vi.unstubAllGlobals();
  });

  it("dispatches typed events to the handler", () => {
    vi.stubGlobal("EventSource", FakeEventSource);
    const received: SseEvent[] = [];
    const sub = subscribeToConversation("proj_1", (event) => received.push(event));

    const source = FakeEventSource.instances[0];
    source.emit("message_started", { type: "message_started", id: "m1", role: "assistant" });
    source.emit("message_delta", { type: "message_delta", id: "m1", delta: "Hi" });
    source.emit("done", { type: "done", durationMs: 12 });

    expect(received).toHaveLength(3);
    expect(received[0]).toMatchObject({ type: "message_started" });
    expect(received[1]).toMatchObject({ type: "message_delta", delta: "Hi" });
    expect(received[2]).toMatchObject({ type: "done" });
    sub.cancel();
    expect(source.readyState).toBe(2);
  });

  it("maps malformed payloads to an error event", () => {
    vi.stubGlobal("EventSource", FakeEventSource);
    const received: SseEvent[] = [];
    subscribeToConversation("proj_1", (event) => received.push(event));

    const source = FakeEventSource.instances[0];
    source.emit("message_delta", { type: "message_delta" }); // 缺 id/delta

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ type: "error", code: "internal_error" });
  });
});
