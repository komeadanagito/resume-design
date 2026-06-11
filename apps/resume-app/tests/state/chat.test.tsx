import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatProvider, useChat } from "@/state/chat";

const fetchMock = vi.fn();

class FakeEventSource {
  static last: FakeEventSource | null = null;
  url: string;
  withCredentials = false;
  readyState = 0;
  private listeners = new Map<string, Set<(ev: MessageEvent) => void>>();

  constructor(url: string) {
    this.url = url;
    FakeEventSource.last = this;
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

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("EventSource", FakeEventSource);
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    if (String(url).endsWith("/state")) {
      return new Response(
        JSON.stringify({
          project: {
            id: "proj_1",
            name: "X",
            locale: "en-US",
            createdAt: "2026-06-12T00:00:00.000Z",
            updatedAt: "2026-06-12T00:00:00.000Z"
          },
          messages: [],
          artifacts: []
        }),
        { status: 200 }
      );
    }
    if (init?.method === "POST" && String(url).endsWith("/messages")) {
      return new Response(JSON.stringify({ accepted: true }), { status: 202 });
    }
    if (init?.method === "POST" && String(url).endsWith("/cancel")) {
      return new Response(JSON.stringify({ cancelled: true }), { status: 200 });
    }
    return new Response("{}", { status: 200 });
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  FakeEventSource.last = null;
  fetchMock.mockReset();
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <ChatProvider projectId="proj_1">{children}</ChatProvider>
);

describe("ChatProvider", () => {
  it("appends a user message, opens SSE, and streams assistant deltas", async () => {
    const { result } = renderHook(() => useChat(), { wrapper });
    // Flush the initial getProjectState load so it doesn't clobber sent messages.
    await act(async () => {});

    await act(async () => {
      await result.current.sendMessage("Hello");
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/conversations/proj_1/messages",
      expect.objectContaining({ method: "POST" })
    );
    expect(result.current.messages.at(-1)).toMatchObject({ role: "user", content: "Hello" });

    const source = FakeEventSource.last!;
    act(() => {
      source.emit("message_started", { type: "message_started", id: "m1", role: "assistant" });
      source.emit("message_delta", { type: "message_delta", id: "m1", delta: "Hi" });
      source.emit("message_delta", { type: "message_delta", id: "m1", delta: " there" });
      source.emit("message_completed", { type: "message_completed", id: "m1" });
      source.emit("done", { type: "done", durationMs: 12 });
    });

    await waitFor(() => {
      expect(result.current.messages.at(-1)).toMatchObject({ role: "assistant", content: "Hi there" });
      expect(result.current.status).toBe("idle");
    });
  });

  it("surfaces SSE errors in chat state", async () => {
    const { result } = renderHook(() => useChat(), { wrapper });
    // Flush the initial getProjectState load so it doesn't clobber sent messages.
    await act(async () => {});

    await act(async () => {
      await result.current.sendMessage("Hi");
    });
    act(() => {
      FakeEventSource.last!.emit("error", {
        type: "error",
        code: "agent_failed",
        message: "rate limited",
        retry: true
      });
    });

    await waitFor(() => {
      expect(result.current.status).toBe("error");
      expect(result.current.errorMessage).toBe("rate limited");
    });
  });

  it("cancelWorking resets to idle and calls the cancel endpoint", async () => {
    const { result } = renderHook(() => useChat(), { wrapper });
    // Flush the initial getProjectState load so it doesn't clobber sent messages.
    await act(async () => {});

    await act(async () => {
      await result.current.sendMessage("Hi");
    });
    act(() => {
      result.current.cancelWorking();
    });

    await waitFor(() => {
      expect(result.current.status).toBe("idle");
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/conversations/proj_1/cancel",
      expect.objectContaining({ method: "POST" })
    );
  });
});
