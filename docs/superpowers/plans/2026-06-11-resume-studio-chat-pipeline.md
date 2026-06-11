# Resume Studio Chat Pipeline (Slice 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** End-to-end chat pipeline — user types in `ChatComposer`, the message round-trips through Fastify daemon and Anthropic BYOK adapter, and the assistant's reply streams back via SSE into `ChatPane`, with a working Stop button.

**Architecture:** Add a `ConversationStore` (JSON file, mirrors the existing `ProjectStore` shape) keyed by project id — one project = one conversation in slice 2. Add an `AnthropicAdapter` that calls `@anthropic-ai/sdk` streaming endpoint and yields `SseEvent` chunks defined in `@resume-studio/contracts`. Wire it into a Fastify SSE route with proper heartbeat / abort handling. On the frontend, delete the `simulateAgentStream` mock in `state/chat.tsx` and replace it with a real `EventSource` subscriber + fetch-based POST.

**Tech Stack:** TypeScript, Fastify SSE (manual `reply.raw` writes), `@anthropic-ai/sdk` v0.40, Zod, Vitest with `undici` fetch mocking, native browser `EventSource` API, React 18 reducers.

---

## Design Decisions (read before starting any task)

These choices are intentional and apply to every task below.

1. **One project = one conversation.** Conversation id is just the project id (no separate UUID). Multi-conversation per project is deferred to a later slice. This eliminates a CRUD surface and keeps URLs flat.
2. **Storage = JSON files.** `<dataDir>/conversations/<projectId>.json` next to `projects.json`. Same atomic temp-file pattern as `ProjectStore`. SQLite migration is slice 10.
3. **BYOK key = env var only.** `ANTHROPIC_API_KEY` read from `process.env` at daemon startup. No UI, no keyring in this slice. Settings UI is slice 7; keyring is slice 10.
4. **Default model = `claude-sonnet-4-6`.** Overridable via `ANTHROPIC_MODEL` env var.
5. **Slice 2 sends only 5 SseEvent variants:** `message_started`, `message_delta`, `message_completed`, `error`, `done`. The other 6 variants (`tool_call`, `tool_done`, `todo_update`, `card`, `artifact_chunk`, `artifact_done`) are reserved for later slices but **already defined in contracts** — do not change contracts.
6. **Cancel = AbortController.** Streamer subscribes to a per-conversation `AbortController`. POST `/cancel` triggers `.abort()`, the streamer emits a final `error { code: "cancelled" }` event and closes.
7. **Frontend types come from contracts.** Delete the locally-drifted types in `apps/resume-app/src/types/index.ts` (it currently has a `Project` with `skillId`/`fidelity` fields that contracts doesn't have); re-export the canonical schemas. Adjust callers.
8. **Frontend chat state uses a real reducer.** The current `state/chat.tsx` uses `useState` with mock data. Replace with a `useReducer` that consumes SSE events and the union narrows correctly.
9. **No Tauri changes.** `apps/resume-app/src-tauri/` is untouched. The Vite dev server proxies `/api/*` to the daemon on port 17456.
10. **Test isolation.** Daemon tests use `createServer({ dataDir: <tmp> })` so each test gets a clean JSON store. Anthropic SDK is mocked via dependency injection (the adapter takes a `client` parameter).

## File Map (locked in before any code)

**New files (backend):**
- `apps/daemon/src/sse/encoder.ts` — encode one `SseEvent` to wire format
- `apps/daemon/src/sse/streamer.ts` — Fastify SSE writer, heartbeat, abort
- `apps/daemon/src/anthropic/adapter.ts` — calls Anthropic streaming, yields `SseEvent`
- `apps/daemon/src/anthropic/types.ts` — narrow type wrapper around the SDK client we depend on
- `apps/daemon/src/conversations/store.ts` — JSON-backed conversation store
- `apps/daemon/src/conversations/routes.ts` — `/api/conversations/:projectId/...` routes
- `apps/daemon/src/conversations/orchestrator.ts` — coordinates store + adapter + abort, exposes `runOnce()`
- `apps/daemon/tests/sse-encoder.test.ts`
- `apps/daemon/tests/sse-streamer.test.ts`
- `apps/daemon/tests/anthropic-adapter.test.ts`
- `apps/daemon/tests/conversations-store.test.ts`
- `apps/daemon/tests/conversations-routes.test.ts`

**Modified files (backend):**
- `apps/daemon/package.json` — add `@anthropic-ai/sdk`
- `apps/daemon/src/env.ts` — add `anthropicApiKey`, `anthropicModel`
- `apps/daemon/src/server.ts` — register conversation routes + inject orchestrator
- `apps/daemon/src/projects/store.ts` — `state()` returns real messages

**Modified files (contracts):**
- `packages/contracts/src/index.ts` — add `SendMessageRequestSchema`
- `packages/contracts/tests/contracts.test.ts` — covers the new schema

**New files (frontend):**
- `apps/resume-app/src/runtime/sse-client.ts` — EventSource wrapper
- `apps/resume-app/src/lib/api.ts` — fetch wrappers for projects + messages + cancel
- `apps/resume-app/tests/runtime/sse-client.test.ts`
- `apps/resume-app/tests/state/chat.test.tsx`

**Modified files (frontend):**
- `apps/resume-app/vite.config.ts` — proxy `/api/*` to `http://127.0.0.1:17456`
- `apps/resume-app/src/types/index.ts` — re-export contracts, drop local drift
- `apps/resume-app/src/state/chat.tsx` — rewrite around `useReducer` + real SSE
- `apps/resume-app/src/state/projects.tsx` — use `lib/api.ts`, contracts types
- `apps/resume-app/src/components/ChatPane.tsx` — remove `STARTER_PROMPTS` `/skill:` syntax (skill picker is slice 5); keep three prompts as plain text
- `apps/resume-app/src/components/ChatComposer.tsx` — strip the hardcoded mock `AgentPicker` menu (slice 7 will reintroduce it powered by `/api/agents`)
- `apps/resume-app/package.json` — add `vitest`, `@testing-library/react`, `jsdom` for unit tests

---

## Task 1: Add Anthropic SDK dependency

**Files:**
- Modify: `apps/daemon/package.json:14-18`

- [ ] **Step 1: Add `@anthropic-ai/sdk` to dependencies**

Edit `apps/daemon/package.json` so the `dependencies` block becomes:

```json
"dependencies": {
  "@anthropic-ai/sdk": "^0.40.0",
  "@resume-studio/contracts": "workspace:*",
  "fastify": "^5.2.0",
  "zod": "^3.23.8"
}
```

- [ ] **Step 2: Install and verify resolution**

Run: `pnpm install`
Expected: lockfile updates; no errors. Verify with `pnpm --filter @resume-studio/daemon list @anthropic-ai/sdk` — should show `0.40.x`.

- [ ] **Step 3: Commit**

```bash
git add apps/daemon/package.json pnpm-lock.yaml
git commit -m "feat(daemon): add @anthropic-ai/sdk for BYOK Anthropic streaming"
```

---

## Task 2: Extend contracts with `SendMessageRequestSchema`

**Files:**
- Modify: `packages/contracts/src/index.ts` (append at end of file, before any `// EOF` marker)
- Modify: `packages/contracts/tests/contracts.test.ts`

- [ ] **Step 1: Write failing test**

Append to `packages/contracts/tests/contracts.test.ts`:

```ts
import { SendMessageRequestSchema } from "../src/index.js";

describe("SendMessageRequestSchema", () => {
  it("requires non-empty text", () => {
    expect(() => SendMessageRequestSchema.parse({ text: "" })).toThrow();
  });

  it("accepts a plain text message", () => {
    const parsed = SendMessageRequestSchema.parse({ text: "Hello" });
    expect(parsed.text).toBe("Hello");
  });

  it("trims surrounding whitespace", () => {
    expect(SendMessageRequestSchema.parse({ text: "  hi  " }).text).toBe("hi");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @resume-studio/contracts test`
Expected: FAIL with `SendMessageRequestSchema is not defined`.

- [ ] **Step 3: Add the schema**

Append to `packages/contracts/src/index.ts` (above the final blank line):

```ts
export const SendMessageRequestSchema = z.object({
  text: z.string().trim().min(1, "text must be non-empty")
});

export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @resume-studio/contracts test`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/index.ts packages/contracts/tests/contracts.test.ts
git commit -m "feat(contracts): add SendMessageRequestSchema"
```

---

## Task 3: SSE encoder utility

**Files:**
- Create: `apps/daemon/src/sse/encoder.ts`
- Test: `apps/daemon/tests/sse-encoder.test.ts`

- [ ] **Step 1: Write failing test**

Create `apps/daemon/tests/sse-encoder.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { SseEvent } from "@resume-studio/contracts";
import { encodeSseEvent } from "../src/sse/encoder.js";

describe("encodeSseEvent", () => {
  it("encodes message_delta as event + data lines", () => {
    const event: SseEvent = { type: "message_delta", id: "msg_1", delta: "Hi" };
    const wire = encodeSseEvent(event);
    expect(wire).toBe(`event: message_delta\ndata: {"type":"message_delta","id":"msg_1","delta":"Hi"}\n\n`);
  });

  it("encodes done with optional token counts", () => {
    const event: SseEvent = { type: "done", durationMs: 1234, tokensIn: 10, tokensOut: 20 };
    expect(encodeSseEvent(event)).toContain(`event: done`);
    expect(encodeSseEvent(event)).toContain(`"tokensOut":20`);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @resume-studio/daemon test sse-encoder`
Expected: FAIL because `../src/sse/encoder.js` does not exist.

- [ ] **Step 3: Implement encoder**

Create `apps/daemon/src/sse/encoder.ts`:

```ts
import type { SseEvent } from "@resume-studio/contracts";

export function encodeSseEvent(event: SseEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

export function encodeHeartbeat(): string {
  return `: ping\n\n`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @resume-studio/daemon test sse-encoder`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/daemon/src/sse/encoder.ts apps/daemon/tests/sse-encoder.test.ts
git commit -m "feat(daemon): SSE event encoder utility"
```

---

## Task 4: SSE streamer (Fastify writer + heartbeat + abort)

**Files:**
- Create: `apps/daemon/src/sse/streamer.ts`
- Test: `apps/daemon/tests/sse-streamer.test.ts`

- [ ] **Step 1: Write failing test**

Create `apps/daemon/tests/sse-streamer.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SseEvent } from "@resume-studio/contracts";
import { runSseStream } from "../src/sse/streamer.js";

function makeFakeReply() {
  const chunks: string[] = [];
  let ended = false;
  const headers: Record<string, string> = {};
  return {
    chunks,
    isEnded: () => ended,
    raw: {
      writeHead(_status: number, h: Record<string, string>) { Object.assign(headers, h); },
      write(chunk: string) { chunks.push(chunk); return true; },
      end() { ended = true; },
      on() { /* close listeners */ }
    },
    headers
  };
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

    await runSseStream(reply.raw as unknown as Parameters<typeof runSseStream>[0]["raw"], events(), { heartbeatMs: 0 });

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

    const promise = runSseStream(reply.raw as unknown as Parameters<typeof runSseStream>[0]["raw"], slowEvents(), { heartbeatMs: 30 });
    await vi.advanceTimersByTimeAsync(150);
    await promise;

    const heartbeats = reply.chunks.filter((c) => c.startsWith(": ping"));
    expect(heartbeats.length).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @resume-studio/daemon test sse-streamer`
Expected: FAIL with "Cannot find module ../src/sse/streamer.js".

- [ ] **Step 3: Implement streamer**

Create `apps/daemon/src/sse/streamer.ts`:

```ts
import type { ServerResponse } from "node:http";
import type { SseEvent } from "@resume-studio/contracts";
import { encodeHeartbeat, encodeSseEvent } from "./encoder.js";

export type StreamOptions = {
  heartbeatMs?: number;
};

export type SseRaw = Pick<ServerResponse, "writeHead" | "write" | "end" | "on">;

export async function runSseStream(
  raw: SseRaw,
  source: AsyncIterable<SseEvent>,
  options: StreamOptions = {}
): Promise<void> {
  raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive"
  });

  const heartbeatMs = options.heartbeatMs ?? 15_000;
  let heartbeatTimer: NodeJS.Timeout | undefined;
  const armHeartbeat = () => {
    if (heartbeatMs <= 0) return;
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(() => raw.write(encodeHeartbeat()), heartbeatMs);
  };

  armHeartbeat();
  try {
    for await (const event of source) {
      raw.write(encodeSseEvent(event));
      armHeartbeat();
    }
  } finally {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    raw.end();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @resume-studio/daemon test sse-streamer`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/daemon/src/sse/streamer.ts apps/daemon/tests/sse-streamer.test.ts
git commit -m "feat(daemon): SSE streamer with heartbeat and graceful close"
```

---

## Task 5: Anthropic adapter (DI-friendly streaming wrapper)

**Files:**
- Create: `apps/daemon/src/anthropic/types.ts`
- Create: `apps/daemon/src/anthropic/adapter.ts`
- Test: `apps/daemon/tests/anthropic-adapter.test.ts`

- [ ] **Step 1: Write failing test**

Create `apps/daemon/tests/anthropic-adapter.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createAnthropicAdapter } from "../src/anthropic/adapter.js";
import type { AnthropicLikeClient } from "../src/anthropic/types.js";

function mockClient(deltas: string[]): AnthropicLikeClient {
  return {
    messages: {
      stream() {
        async function* iter() {
          for (const text of deltas) {
            yield { type: "content_block_delta", delta: { type: "text_delta", text } };
          }
          yield { type: "message_stop" };
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
    expect(events.filter((e) => e.type === "message_delta").map((e) => (e as { delta: string }).delta)).toEqual(["Hello", ", ", "world"]);
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

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "error", code: "agent_failed" });
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
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @resume-studio/daemon test anthropic-adapter`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement the type narrowing**

Create `apps/daemon/src/anthropic/types.ts`:

```ts
export type AnthropicTextDelta = {
  type: "content_block_delta";
  delta: { type: "text_delta"; text: string };
};

export type AnthropicMessageStop = { type: "message_stop" };

export type AnthropicStreamEvent = AnthropicTextDelta | AnthropicMessageStop;

export type AnthropicMessageStream = AsyncIterable<AnthropicStreamEvent>;

export type AnthropicLikeClient = {
  messages: {
    stream(args?: unknown): AnthropicMessageStream;
  };
};
```

- [ ] **Step 4: Implement the adapter**

Create `apps/daemon/src/anthropic/adapter.ts`:

```ts
import type { ChatMessage, SseEvent } from "@resume-studio/contracts";
import type { AnthropicLikeClient } from "./types.js";

export type AnthropicAdapterOptions = {
  client: AnthropicLikeClient;
  model: string;
  maxTokens?: number;
};

export type RunInput = {
  messages: Array<Pick<ChatMessage, "role" | "content">>;
  abortSignal: AbortSignal;
};

export type AnthropicAdapter = {
  run(input: RunInput): AsyncGenerator<SseEvent>;
};

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function createAnthropicAdapter(options: AnthropicAdapterOptions): AnthropicAdapter {
  const { client, model, maxTokens = 4096 } = options;

  return {
    async *run({ messages, abortSignal }) {
      const messageId = makeId("msg");
      const startedAt = Date.now();
      let outputChars = 0;

      yield { type: "message_started", id: messageId, role: "assistant" };

      let stream: AsyncIterable<{ type: string; delta?: { type: string; text?: string } }>;
      try {
        stream = client.messages.stream({
          model,
          max_tokens: maxTokens,
          messages: messages
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({ role: m.role, content: m.content }))
        });
      } catch (err) {
        yield { type: "error", code: "agent_failed", message: errorMessage(err), retry: true };
        return;
      }

      try {
        for await (const event of stream) {
          if (abortSignal.aborted) {
            yield { type: "error", code: "cancelled", message: "Cancelled by user", retry: false };
            return;
          }
          if (event.type === "content_block_delta" && event.delta?.type === "text_delta" && event.delta.text) {
            outputChars += event.delta.text.length;
            yield { type: "message_delta", id: messageId, delta: event.delta.text };
          }
        }
      } catch (err) {
        if (abortSignal.aborted) {
          yield { type: "error", code: "cancelled", message: "Cancelled by user", retry: false };
        } else {
          yield { type: "error", code: "agent_failed", message: errorMessage(err), retry: true };
        }
        return;
      }

      yield { type: "message_completed", id: messageId };
      yield { type: "done", durationMs: Date.now() - startedAt, tokensOut: Math.ceil(outputChars / 4) };
    }
  };
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @resume-studio/daemon test anthropic-adapter`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/daemon/src/anthropic/ apps/daemon/tests/anthropic-adapter.test.ts
git commit -m "feat(daemon): Anthropic adapter yielding contracts SseEvent stream"
```

---

## Task 6: Conversation store (JSON file)

**Files:**
- Create: `apps/daemon/src/conversations/store.ts`
- Test: `apps/daemon/tests/conversations-store.test.ts`

- [ ] **Step 1: Write failing test**

Create `apps/daemon/tests/conversations-store.test.ts`:

```ts
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ConversationStore } from "../src/conversations/store.js";

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @resume-studio/daemon test conversations-store`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement the store**

Create `apps/daemon/src/conversations/store.ts`:

```ts
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { ChatMessageSchema, type ChatMessage } from "@resume-studio/contracts";

type ConversationFile = {
  projectId: string;
  messages: ChatMessage[];
};

function nowIso() {
  return new Date().toISOString();
}

function newId() {
  return `msg_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
}

export class ConversationStore {
  private readonly dir: string;

  constructor(dataDir: string) {
    this.dir = join(dataDir, "conversations");
  }

  async listMessages(projectId: string): Promise<ChatMessage[]> {
    const file = await this.read(projectId);
    return file.messages;
  }

  async append(
    projectId: string,
    input: Pick<ChatMessage, "role" | "content">
  ): Promise<ChatMessage> {
    const file = await this.read(projectId);
    const message = ChatMessageSchema.parse({
      id: newId(),
      role: input.role,
      content: input.content,
      createdAt: nowIso()
    });
    file.messages.push(message);
    await this.write(projectId, file);
    return message;
  }

  private path(projectId: string): string {
    return join(this.dir, `${projectId}.json`);
  }

  private async read(projectId: string): Promise<ConversationFile> {
    try {
      const raw = await readFile(this.path(projectId), "utf8");
      const parsed = JSON.parse(raw) as ConversationFile;
      return {
        projectId,
        messages: parsed.messages.map((message) => ChatMessageSchema.parse(message))
      };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") return { projectId, messages: [] };
      throw error;
    }
  }

  private async write(projectId: string, file: ConversationFile): Promise<void> {
    const target = this.path(projectId);
    await mkdir(dirname(target), { recursive: true });
    const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tmp, `${JSON.stringify(file, null, 2)}\n`, "utf8");
    await rename(tmp, target);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @resume-studio/daemon test conversations-store`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/daemon/src/conversations/store.ts apps/daemon/tests/conversations-store.test.ts
git commit -m "feat(daemon): JSON-backed ConversationStore keyed by projectId"
```

---

## Task 7: Conversation orchestrator (store + adapter + abort)

**Files:**
- Create: `apps/daemon/src/conversations/orchestrator.ts`
- Test: extend `apps/daemon/tests/conversations-store.test.ts` (orchestrator tests live alongside store tests; see below)

- [ ] **Step 1: Write failing test**

Append to `apps/daemon/tests/conversations-store.test.ts` (or create a sibling file):

```ts
import { ConversationOrchestrator } from "../src/conversations/orchestrator.js";
import { createAnthropicAdapter } from "../src/anthropic/adapter.js";

describe("ConversationOrchestrator", () => {
  it("persists user message then streams assistant deltas", async () => {
    const { store } = await makeStore();
    const adapter = createAnthropicAdapter({
      client: {
        messages: {
          stream() {
            async function* iter() {
              yield { type: "content_block_delta", delta: { type: "text_delta", text: "Hi" } };
              yield { type: "message_stop" };
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @resume-studio/daemon test conversations-store`
Expected: FAIL with `ConversationOrchestrator` not found.

- [ ] **Step 3: Implement the orchestrator**

Create `apps/daemon/src/conversations/orchestrator.ts`:

```ts
import type { ChatMessage, SseEvent } from "@resume-studio/contracts";
import type { AnthropicAdapter } from "../anthropic/adapter.js";
import { ConversationStore } from "./store.js";

export type OrchestratorOptions = {
  store: ConversationStore;
  adapter: AnthropicAdapter;
};

export class ConversationOrchestrator {
  private readonly store: ConversationStore;
  private readonly adapter: AnthropicAdapter;
  private readonly inflight = new Map<string, AbortController>();

  constructor(options: OrchestratorOptions) {
    this.store = options.store;
    this.adapter = options.adapter;
  }

  async *runOnce(projectId: string, input: { text: string }): AsyncGenerator<SseEvent> {
    const controller = new AbortController();
    this.inflight.set(projectId, controller);

    try {
      const userMsg = await this.store.append(projectId, { role: "user", content: input.text });
      const history = await this.store.listMessages(projectId);

      let assistantBuffer = "";
      let assistantPersisted = false;

      const stream = this.adapter.run({
        messages: history.map((message): Pick<ChatMessage, "role" | "content"> => ({
          role: message.role,
          content: message.content
        })),
        abortSignal: controller.signal
      });

      for await (const event of stream) {
        if (event.type === "message_delta") {
          assistantBuffer += event.delta;
        }
        if (event.type === "message_completed" && !assistantPersisted) {
          await this.store.append(projectId, { role: "assistant", content: assistantBuffer });
          assistantPersisted = true;
        }
        yield event;
      }

      if (!assistantPersisted && assistantBuffer.length > 0) {
        await this.store.append(projectId, { role: "assistant", content: assistantBuffer });
      }

      void userMsg;
    } finally {
      this.inflight.delete(projectId);
    }
  }

  cancel(projectId: string): boolean {
    const controller = this.inflight.get(projectId);
    if (!controller) return false;
    controller.abort();
    return true;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @resume-studio/daemon test conversations-store`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/daemon/src/conversations/orchestrator.ts apps/daemon/tests/conversations-store.test.ts
git commit -m "feat(daemon): ConversationOrchestrator wiring store + adapter + abort"
```

---

## Task 8: Extend `env.ts` with Anthropic config

**Files:**
- Modify: `apps/daemon/src/env.ts`

- [ ] **Step 1: Replace env.ts content**

Replace the entire contents of `apps/daemon/src/env.ts`:

```ts
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type DaemonOptions = {
  rootDir?: string;
  dataDir?: string;
  port?: number;
  anthropicApiKey?: string;
  anthropicModel?: string;
};

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

export function resolveEnv(options: DaemonOptions = {}) {
  const rootDir = resolve(options.rootDir ?? repoRoot);
  const dataDir = resolve(options.dataDir ?? process.env.RESUME_STUDIO_DATA_DIR ?? ".tmp/resume-studio");
  const port = options.port ?? Number(process.env.OD_RESUME_PORT ?? 17456);
  const anthropicApiKey = options.anthropicApiKey ?? process.env.ANTHROPIC_API_KEY ?? "";
  const anthropicModel = options.anthropicModel ?? process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

  return { rootDir, dataDir, port, anthropicApiKey, anthropicModel };
}
```

- [ ] **Step 2: Verify typecheck still passes**

Run: `pnpm --filter @resume-studio/daemon typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/daemon/src/env.ts
git commit -m "feat(daemon): expose ANTHROPIC_API_KEY / ANTHROPIC_MODEL via env"
```

---

## Task 9: Conversation routes (messages POST + stream GET + cancel POST)

**Files:**
- Create: `apps/daemon/src/conversations/routes.ts`
- Test: `apps/daemon/tests/conversations-routes.test.ts`

- [ ] **Step 1: Write failing test**

Create `apps/daemon/tests/conversations-routes.test.ts`:

```ts
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
            for (const text of deltas) yield { type: "content_block_delta", delta: { type: "text_delta", text } };
            yield { type: "message_stop" };
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

  it("POST /messages 202s and persists the user message", async () => {
    const { app, store } = await buildApp([]);
    const response = await app.inject({
      method: "POST",
      url: "/api/conversations/proj_1/messages",
      payload: { text: "Hello" }
    });
    expect(response.statusCode).toBe(202);
    const messages = await store.listMessages("proj_1");
    expect(messages[0]).toMatchObject({ role: "user", content: "Hello" });
    await app.close();
  });

  it("GET /stream returns SSE chunks for the queued run", async () => {
    const { app } = await buildApp(["Hi"]);
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @resume-studio/daemon test conversations-routes`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement routes**

Create `apps/daemon/src/conversations/routes.ts`:

```ts
import type { FastifyInstance, FastifyReply } from "fastify";
import { ZodError } from "zod";
import {
  AppErrorSchema,
  SendMessageRequestSchema,
  type AppError,
  type SseEvent
} from "@resume-studio/contracts";
import { runSseStream } from "../sse/streamer.js";
import type { ConversationOrchestrator } from "./orchestrator.js";
import type { ConversationStore } from "./store.js";

type RouteDeps = {
  orchestrator: ConversationOrchestrator;
  store: ConversationStore;
};

type QueuedRun = AsyncIterable<SseEvent>;

function sendError(reply: FastifyReply, statusCode: number, error: AppError) {
  return reply.code(statusCode).send(AppErrorSchema.parse(error));
}

export async function registerConversationRoutes(server: FastifyInstance, deps: RouteDeps) {
  // Per-server queue — created inside the closure so each createServer() call gets isolated state.
  const queued = new Map<string, QueuedRun>();

  server.post<{ Params: { projectId: string }; Body: unknown }>(
    "/api/conversations/:projectId/messages",
    async (request, reply) => {
      try {
        const body = SendMessageRequestSchema.parse(request.body ?? {});
        queued.set(request.params.projectId, deps.orchestrator.runOnce(request.params.projectId, body));
        return reply.code(202).send({ accepted: true });
      } catch (error) {
        if (error instanceof ZodError) {
          return sendError(reply, 400, {
            code: "validation_failed",
            message: "Invalid message payload",
            retry: false,
            details: error.flatten()
          });
        }
        throw error;
      }
    }
  );

  server.get<{ Params: { projectId: string } }>(
    "/api/conversations/:projectId/stream",
    async (request, reply) => {
      const run = queued.get(request.params.projectId);
      if (!run) {
        return sendError(reply, 409, {
          code: "bad_request",
          message: "No queued run; POST /messages first",
          retry: false
        });
      }
      queued.delete(request.params.projectId);

      reply.hijack();
      await runSseStream(reply.raw, run);
    }
  );

  server.post<{ Params: { projectId: string } }>(
    "/api/conversations/:projectId/cancel",
    async (request) => {
      const cancelled = deps.orchestrator.cancel(request.params.projectId);
      return { cancelled };
    }
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @resume-studio/daemon test conversations-routes`
Expected: PASS (all four tests).

- [ ] **Step 5: Commit**

```bash
git add apps/daemon/src/conversations/routes.ts apps/daemon/tests/conversations-routes.test.ts
git commit -m "feat(daemon): conversation routes — POST messages, GET stream (SSE), POST cancel"
```

---

## Task 10: Update `ProjectStore.state()` to return real messages

**Files:**
- Modify: `apps/daemon/src/projects/store.ts:105-108`

- [ ] **Step 1: Write failing test**

Append to `apps/daemon/tests/projects.test.ts`:

```ts
import { ConversationStore } from "../src/conversations/store.js";

describe("ProjectStore.state() with conversations", () => {
  it("returns messages from the conversation store", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rs-proj-conv-"));
    const conv = new ConversationStore(dir);
    const store = new ProjectStore(dir, { conversations: conv });
    const project = await store.create({ name: "X", locale: "en-US" });
    await conv.append(project.id, { role: "user", content: "Hi" });

    const state = await store.state(project.id);
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0].content).toBe("Hi");
  });
});
```

> If `apps/daemon/tests/projects.test.ts` already imports these, append the test only. Otherwise add the needed imports.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @resume-studio/daemon test projects`
Expected: FAIL — the second constructor arg does not exist yet.

- [ ] **Step 3: Modify `ProjectStore` to accept an optional `ConversationStore`**

In `apps/daemon/src/projects/store.ts`, change the class header and `state()` method:

```ts
import type { ConversationStore } from "../conversations/store.js";

export type ProjectStoreDeps = {
  conversations?: ConversationStore;
};

export class ProjectStore {
  private readonly filePath: string;
  private readonly conversations?: ConversationStore;

  constructor(dataDir: string, deps: ProjectStoreDeps = {}) {
    this.filePath = join(dataDir, "projects.json");
    this.conversations = deps.conversations;
  }

  // ... existing methods unchanged ...

  async state(id: string): Promise<ProjectState> {
    const project = await this.get(id);
    const messages = this.conversations ? await this.conversations.listMessages(id) : [];
    return { project, messages, artifacts: [] };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @resume-studio/daemon test projects`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/daemon/src/projects/store.ts apps/daemon/tests/projects.test.ts
git commit -m "feat(daemon): ProjectStore.state() returns real conversation messages"
```

---

## Task 11: Wire orchestrator + routes into `createServer`

**Files:**
- Modify: `apps/daemon/src/server.ts`

- [ ] **Step 1: Write failing test**

Append to `apps/daemon/tests/server.test.ts`:

```ts
describe("server wiring", () => {
  it("exposes conversation routes", async () => {
    const server = await createServer({ dataDir: ".tmp/rs-server-conv" });
    const res = await server.inject({ method: "POST", url: "/api/conversations/proj_1/cancel" });
    expect(res.statusCode).toBe(200);
    await server.close();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @resume-studio/daemon test server`
Expected: FAIL with 404.

- [ ] **Step 3: Wire in `createServer`**

Replace `apps/daemon/src/server.ts` body so it constructs the adapter, orchestrator, store, and registers the new routes. The full file becomes:

```ts
import Anthropic from "@anthropic-ai/sdk";
import Fastify, { type FastifyInstance } from "fastify";
import { AppErrorSchema, type AppError } from "@resume-studio/contracts";
import { createAnthropicAdapter } from "./anthropic/adapter.js";
import type { AnthropicLikeClient } from "./anthropic/types.js";
import { loadDesignSystems, loadSkills, summarizeDesignSystem, summarizeSkill } from "./content-index.js";
import { ConversationOrchestrator } from "./conversations/orchestrator.js";
import { ConversationStore } from "./conversations/store.js";
import { registerConversationRoutes } from "./conversations/routes.js";
import { type DaemonOptions, resolveEnv } from "./env.js";
import { registerProjectRoutes } from "./projects/routes.js";
import { ProjectStore } from "./projects/store.js";

function appError(error: AppError, statusCode: number) {
  return { statusCode, body: AppErrorSchema.parse(error) };
}

export async function createServer(options: DaemonOptions = {}): Promise<FastifyInstance> {
  const env = resolveEnv(options);
  const startedAt = Date.now();
  const server = Fastify({ logger: false });

  const skills = await loadSkills(env.rootDir);
  const designSystems = await loadDesignSystems(env.rootDir);
  const conversationStore = new ConversationStore(env.dataDir);
  const projectStore = new ProjectStore(env.dataDir, { conversations: conversationStore });

  const adapter = createAnthropicAdapter({
    client: env.anthropicApiKey
      ? (new Anthropic({ apiKey: env.anthropicApiKey }) as unknown as AnthropicLikeClient)
      : disabledClient,
    model: env.anthropicModel
  });
  const orchestrator = new ConversationOrchestrator({ store: conversationStore, adapter });

  server.get("/api/health", async () => ({
    status: "ok",
    version: "0.1.0",
    uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
    agents: { cliCount: 0, byokProviders: env.anthropicApiKey ? 1 : 0 },
    skills: skills.length,
    designSystems: designSystems.length
  }));

  server.get("/api/skills", async () => skills.map(summarizeSkill));
  server.get<{ Params: { id: string } }>("/api/skills/:id", async (request, reply) => {
    const skill = skills.find((item) => item.id === request.params.id);
    if (!skill) {
      const error = appError({ code: "not_found", message: `Skill not found: ${request.params.id}`, retry: false }, 404);
      return reply.code(error.statusCode).send(error.body);
    }
    return skill;
  });

  server.get("/api/design-systems", async () => designSystems.map(summarizeDesignSystem));
  server.get<{ Params: { id: string } }>("/api/design-systems/:id", async (request, reply) => {
    const designSystem = designSystems.find((item) => item.id === request.params.id);
    if (!designSystem) {
      const error = appError(
        { code: "not_found", message: `Design system not found: ${request.params.id}`, retry: false },
        404
      );
      return reply.code(error.statusCode).send(error.body);
    }
    return designSystem;
  });

  await registerProjectRoutes(server, projectStore);
  await registerConversationRoutes(server, { orchestrator, store: conversationStore });

  return server;
}

const disabledClient: AnthropicLikeClient = {
  messages: {
    stream() {
      throw new Error("ANTHROPIC_API_KEY not set; configure it in your environment to enable chat.");
    }
  }
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @resume-studio/daemon test server`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/daemon/src/server.ts apps/daemon/tests/server.test.ts
git commit -m "feat(daemon): wire conversation routes into createServer"
```

---

## Task 12: Frontend Vite proxy + types re-export

**Files:**
- Modify: `apps/resume-app/vite.config.ts`
- Modify: `apps/resume-app/src/types/index.ts`

- [ ] **Step 1: Update Vite proxy**

Open `apps/resume-app/vite.config.ts`. Find the `defineConfig({ ... })` block and add a `server.proxy` section. If the file currently exports a minimal config, replace it with:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:17456",
        changeOrigin: true
      }
    }
  }
});
```

- [ ] **Step 2: Replace `types/index.ts` with re-exports**

Replace the **entire** contents of `apps/resume-app/src/types/index.ts` with:

```ts
export type {
  AgentInfo,
  AppError,
  Artifact,
  ChatMessage,
  DesignSystemDetail,
  DesignSystemSummary,
  HumanLoopCard,
  Locale,
  Project,
  ProjectState,
  SendMessageRequest,
  SkillDetail,
  SkillSummary,
  SseEvent,
  Todo
} from "@resume-studio/contracts";
```

- [ ] **Step 3: Add contracts as a workspace dependency**

Edit `apps/resume-app/package.json`. In `dependencies`, add:

```json
"@resume-studio/contracts": "workspace:*",
```

Run: `pnpm install`
Expected: workspace link installed.

- [ ] **Step 4: Typecheck and fix obvious drift**

Run: `pnpm --filter resume-app typecheck`
Expected: errors in `state/projects.tsx` and `state/chat.tsx` because the old `Project` had `skillId`, `fidelity`, and `updatedAt` as `number` (Date.now()), while contracts uses ISO date strings and no `skillId`. **These errors are addressed in Tasks 14 & 15.** Leave them for now.

- [ ] **Step 5: Commit**

```bash
git add apps/resume-app/vite.config.ts apps/resume-app/src/types/index.ts apps/resume-app/package.json pnpm-lock.yaml
git commit -m "feat(web): proxy /api to daemon and adopt contracts types"
```

---

## Task 13: Frontend `lib/api.ts` (fetch wrappers)

**Files:**
- Create: `apps/resume-app/src/lib/api.ts`

- [ ] **Step 1: Implement `lib/api.ts`**

Create `apps/resume-app/src/lib/api.ts`:

```ts
import type { AppError, Project, ProjectState, SendMessageRequest } from "@/types";

export class ApiError extends Error {
  readonly app: AppError;
  readonly status: number;

  constructor(status: number, app: AppError) {
    super(app.message);
    this.app = app;
    this.status = status;
  }
}

async function parse<T>(response: Response): Promise<T> {
  if (response.ok) return (await response.json()) as T;
  let payload: AppError;
  try {
    payload = (await response.json()) as AppError;
  } catch {
    payload = { code: "internal_error", message: response.statusText || "Network error", retry: false };
  }
  throw new ApiError(response.status, payload);
}

export async function listProjects(): Promise<Project[]> {
  return parse(await fetch("/api/projects"));
}

export async function getProjectState(projectId: string): Promise<ProjectState> {
  return parse(await fetch(`/api/projects/${encodeURIComponent(projectId)}/state`));
}

export async function sendMessage(projectId: string, body: SendMessageRequest): Promise<void> {
  const response = await fetch(`/api/conversations/${encodeURIComponent(projectId)}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (response.status !== 202) await parse(response);
}

export async function cancelRun(projectId: string): Promise<{ cancelled: boolean }> {
  return parse(await fetch(`/api/conversations/${encodeURIComponent(projectId)}/cancel`, { method: "POST" }));
}
```

> The `@/types` alias is already configured via Vite/TS paths in this repo; if not, use a relative import `../types`.

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter resume-app typecheck`
Expected: `lib/api.ts` itself has no errors (errors elsewhere from Task 12 still remain; addressed in 14-15).

- [ ] **Step 3: Commit**

```bash
git add apps/resume-app/src/lib/api.ts
git commit -m "feat(web): typed fetch wrappers for projects + conversations"
```

---

## Task 14: Frontend SSE client

**Files:**
- Create: `apps/resume-app/src/runtime/sse-client.ts`
- Test: `apps/resume-app/tests/runtime/sse-client.test.ts`

- [ ] **Step 1: Install test deps (one-time)**

Edit `apps/resume-app/package.json`. Add to `devDependencies`:

```json
"@testing-library/react": "^16.1.0",
"@types/jsdom": "^21.1.7",
"jsdom": "^25.0.1",
"vitest": "^2.1.8"
```

Add the test script to the `scripts` block:

```json
"test": "vitest run"
```

Run: `pnpm install`
Expected: success.

Create `apps/resume-app/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: false
  },
  resolve: {
    alias: { "@": new URL("./src", import.meta.url).pathname }
  }
});
```

- [ ] **Step 2: Write failing test**

Create `apps/resume-app/tests/runtime/sse-client.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SseEvent } from "@/types";
import { subscribeToConversation } from "@/runtime/sse-client";

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  url: string;
  withCredentials: boolean;
  readyState = 0;
  onopen: ((ev: unknown) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  private listeners = new Map<string, Set<(ev: MessageEvent) => void>>();
  constructor(url: string) {
    this.url = url;
    this.withCredentials = false;
    FakeEventSource.instances.push(this);
  }
  addEventListener(type: string, listener: (ev: MessageEvent) => void) {
    let set = this.listeners.get(type);
    if (!set) { set = new Set(); this.listeners.set(type, set); }
    set.add(listener);
  }
  removeEventListener(type: string, listener: (ev: MessageEvent) => void) {
    this.listeners.get(type)?.delete(listener);
  }
  close() { this.readyState = 2; }
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

  it("dispatches typed events to the handler", async () => {
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
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter resume-app test`
Expected: FAIL with module not found.

- [ ] **Step 4: Implement client**

Create `apps/resume-app/src/runtime/sse-client.ts`:

```ts
import { SseEventSchema, type SseEvent } from "@resume-studio/contracts";

export type SseSubscription = {
  cancel(): void;
};

const EVENT_TYPES = [
  "message_started",
  "message_delta",
  "message_completed",
  "tool_call",
  "tool_done",
  "todo_update",
  "card",
  "artifact_chunk",
  "artifact_done",
  "error",
  "done"
] as const;

export function subscribeToConversation(
  projectId: string,
  onEvent: (event: SseEvent) => void
): SseSubscription {
  const source = new EventSource(`/api/conversations/${encodeURIComponent(projectId)}/stream`);

  const handlers = new Map<string, EventListener>();
  for (const type of EVENT_TYPES) {
    const listener: EventListener = (ev) => {
      try {
        const parsed = SseEventSchema.parse(JSON.parse((ev as MessageEvent).data));
        onEvent(parsed);
      } catch (err) {
        onEvent({
          type: "error",
          code: "internal_error",
          message: `Failed to parse SSE ${type}: ${String((err as Error).message)}`,
          retry: false
        });
      }
    };
    source.addEventListener(type, listener);
    handlers.set(type, listener);
  }

  return {
    cancel() {
      for (const [type, listener] of handlers) source.removeEventListener(type, listener);
      source.close();
    }
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter resume-app test runtime/sse-client`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/resume-app/src/runtime/sse-client.ts apps/resume-app/tests/runtime/sse-client.test.ts apps/resume-app/package.json apps/resume-app/vitest.config.ts pnpm-lock.yaml
git commit -m "feat(web): EventSource-based SSE client validated against contracts schema"
```

---

## Task 15: Rewrite `state/chat.tsx` around a real reducer + SSE

**Files:**
- Modify: `apps/resume-app/src/state/chat.tsx` (rewrite entire file)
- Test: `apps/resume-app/tests/state/chat.test.tsx`

This task removes ~300 lines of mock code and replaces them with ~150 lines that consume real SSE events.

- [ ] **Step 1: Write failing test**

Create `apps/resume-app/tests/state/chat.test.tsx`:

```tsx
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatProvider, useChat } from "@/state/chat";

const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ accepted: true }), { status: 202 }));
});

class FakeEventSource {
  static last: FakeEventSource | null = null;
  url: string;
  withCredentials = false;
  readyState = 0;
  private listeners = new Map<string, Set<(ev: MessageEvent) => void>>();
  constructor(url: string) { this.url = url; FakeEventSource.last = this; }
  addEventListener(type: string, listener: (ev: MessageEvent) => void) {
    let set = this.listeners.get(type);
    if (!set) { set = new Set(); this.listeners.set(type, set); }
    set.add(listener);
  }
  removeEventListener(type: string, listener: (ev: MessageEvent) => void) {
    this.listeners.get(type)?.delete(listener);
  }
  close() { this.readyState = 2; }
  emit(type: string, data: unknown) {
    const ev = new MessageEvent(type, { data: JSON.stringify(data) });
    this.listeners.get(type)?.forEach((l) => l(ev));
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  FakeEventSource.last = null;
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <ChatProvider projectId="proj_1">{children}</ChatProvider>
);

describe("ChatProvider", () => {
  it("appends a user message, opens SSE, and streams assistant deltas", async () => {
    vi.stubGlobal("EventSource", FakeEventSource);
    const { result } = renderHook(() => useChat(), { wrapper });

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

    expect(result.current.messages.at(-1)).toMatchObject({ role: "assistant", content: "Hi there" });
    expect(result.current.status).toBe("idle");
  });

  it("renders an error message when SSE emits error", async () => {
    vi.stubGlobal("EventSource", FakeEventSource);
    const { result } = renderHook(() => useChat(), { wrapper });

    await act(async () => { await result.current.sendMessage("Hi"); });
    act(() => {
      FakeEventSource.last!.emit("error", { type: "error", code: "agent_failed", message: "rate limited", retry: true });
    });

    expect(result.current.status).toBe("error");
    expect(result.current.errorMessage).toBe("rate limited");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter resume-app test state/chat`
Expected: FAIL because the rewritten `ChatProvider` does not exist yet.

- [ ] **Step 3: Replace `state/chat.tsx`**

Replace the **entire** contents of `apps/resume-app/src/state/chat.tsx` with:

```tsx
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import type { ChatMessage, SseEvent } from "@/types";
import { cancelRun, getProjectState, sendMessage as postMessage } from "@/lib/api";
import { subscribeToConversation, type SseSubscription } from "@/runtime/sse-client";

export type ChatStatus = "idle" | "thinking" | "writing" | "error";

type ChatState = {
  messages: ChatMessage[];
  status: ChatStatus;
  errorMessage?: string;
  inflightAssistantId?: string;
  inflightContent: string;
};

type ChatAction =
  | { kind: "load"; messages: ChatMessage[] }
  | { kind: "userSent"; message: ChatMessage }
  | { kind: "sse"; event: SseEvent }
  | { kind: "cancel" };

const initialState: ChatState = { messages: [], status: "idle", inflightContent: "" };

function reducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.kind) {
    case "load":
      return { ...initialState, messages: action.messages };
    case "userSent":
      return {
        ...state,
        messages: [...state.messages, action.message],
        status: "thinking",
        errorMessage: undefined,
        inflightContent: ""
      };
    case "cancel":
      return { ...state, status: "idle", inflightAssistantId: undefined, inflightContent: "" };
    case "sse": {
      const event = action.event;
      switch (event.type) {
        case "message_started":
          return { ...state, status: "writing", inflightAssistantId: event.id, inflightContent: "" };
        case "message_delta":
          return { ...state, inflightContent: state.inflightContent + event.delta };
        case "message_completed": {
          const id = state.inflightAssistantId ?? event.id;
          const message: ChatMessage = {
            id,
            role: "assistant",
            content: state.inflightContent,
            createdAt: new Date().toISOString()
          };
          return {
            ...state,
            messages: [...state.messages, message],
            inflightAssistantId: undefined,
            inflightContent: ""
          };
        }
        case "done":
          return { ...state, status: "idle" };
        case "error":
          return { ...state, status: "error", errorMessage: event.message };
        default:
          return state;
      }
    }
  }
}

export type ChatContextValue = {
  messages: ChatMessage[];
  pendingAssistantContent: string;
  status: ChatStatus;
  errorMessage?: string;
  sendMessage(text: string): Promise<void>;
  cancel(): Promise<void>;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ projectId, children }: { projectId: string; children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    let cancelled = false;
    void getProjectState(projectId)
      .then((result) => { if (!cancelled) dispatch({ kind: "load", messages: result.messages }); })
      .catch(() => { /* ignore — keeps initial empty state */ });
    return () => { cancelled = true; };
  }, [projectId]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const userMessage: ChatMessage = {
        id: `local_${Date.now()}`,
        role: "user",
        content: trimmed,
        createdAt: new Date().toISOString()
      };
      dispatch({ kind: "userSent", message: userMessage });
      try {
        await postMessage(projectId, { text: trimmed });
      } catch (err) {
        dispatch({ kind: "sse", event: { type: "error", code: "internal_error", message: (err as Error).message, retry: true } });
        return;
      }
      let subscription: SseSubscription | undefined;
      subscription = subscribeToConversation(projectId, (event) => {
        dispatch({ kind: "sse", event });
        if (event.type === "done" || event.type === "error") subscription?.cancel();
      });
    },
    [projectId]
  );

  const cancel = useCallback(async () => {
    dispatch({ kind: "cancel" });
    try { await cancelRun(projectId); } catch { /* ignore — UI already in idle */ }
  }, [projectId]);

  const value = useMemo<ChatContextValue>(
    () => ({
      messages: state.messages,
      pendingAssistantContent: state.inflightContent,
      status: state.status,
      errorMessage: state.errorMessage,
      sendMessage,
      cancel
    }),
    [state, sendMessage, cancel]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within <ChatProvider>");
  return ctx;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter resume-app test state/chat`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/resume-app/src/state/chat.tsx apps/resume-app/tests/state/chat.test.tsx
git commit -m "feat(web): replace chat mock with real SSE reducer"
```

---

## Task 16: Simplify `state/projects.tsx` and align with contracts types

**Files:**
- Modify: `apps/resume-app/src/state/projects.tsx`

Old file uses `Date.now()` numeric timestamps and a `skillId`/`fidelity` shape that contracts doesn't have. Slice 1 backend doesn't store those either. Slice 5/7 will reintroduce skill picking through the chat protocol.

- [ ] **Step 1: Replace `state/projects.tsx`**

Replace the **entire** contents of `apps/resume-app/src/state/projects.tsx` with:

```tsx
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Locale, Project } from "@/types";
import { ApiError, listProjects } from "@/lib/api";

export type ProjectsContextValue = {
  projects: Project[];
  loading: boolean;
  error?: string;
  refresh(): Promise<void>;
  createProject(input: { name: string; locale: Locale; designSystemId?: string }): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;
  duplicateProject(id: string): Promise<Project | undefined>;
};

const ProjectsContext = createContext<ProjectsContextValue | null>(null);

async function postJson<T>(url: string, body: unknown, method = "POST"): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ code: "internal_error", message: res.statusText }));
    throw new ApiError(res.status, detail);
  }
  return res.json() as Promise<T>;
}

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setProjects(await listProjects());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createProject = useCallback(
    async (input: { name: string; locale: Locale; designSystemId?: string }) => {
      try {
        const project = await postJson<Project>("/api/projects", input);
        setProjects((prev) => [project, ...prev]);
        return project;
      } catch (err) {
        setError((err as Error).message);
        return undefined;
      }
    },
    []
  );

  const deleteProject = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error(res.statusText);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    }
  }, []);

  const duplicateProject = useCallback(async (id: string) => {
    try {
      const project = await postJson<Project>(`/api/projects/${encodeURIComponent(id)}/duplicate`, {});
      setProjects((prev) => [project, ...prev]);
      return project;
    } catch (err) {
      setError((err as Error).message);
      return undefined;
    }
  }, []);

  return (
    <ProjectsContext.Provider
      value={{ projects, loading, error, refresh, createProject, deleteProject, duplicateProject }}
    >
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjects() {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error("useProjects must be used within <ProjectsProvider>");
  return ctx;
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter resume-app typecheck`
Expected: ProjectsContext-related errors gone. Any remaining errors in components (`EntryView.tsx`, `ProjectView.tsx`) about old `Project` fields like `skillId` need to be fixed in those callers — search for `\.skillId` / `\.fidelity` and remove those references; replace `project.updatedAt` numeric comparisons with `Date.parse(project.updatedAt)`.

> If you find callers that depend on `skillId`/`fidelity`, gate them: render them only when a future slice repopulates these via the orchestrator. For now, just drop them from the UI surface.

- [ ] **Step 3: Commit**

```bash
git add apps/resume-app/src/state/projects.tsx apps/resume-app/src/components/EntryView.tsx
git commit -m "refactor(web): align ProjectsProvider with contracts schema"
```

---

## Task 17: Trim `ChatPane.tsx` and `ChatComposer.tsx` to slice-2 surface

**Files:**
- Modify: `apps/resume-app/src/components/ChatPane.tsx`
- Modify: `apps/resume-app/src/components/ChatComposer.tsx`

Goal: keep the visual layout, but remove dead UI that depends on later-slice features (`/skill:` syntax, mock agent picker, hardcoded BYOK provider list). The chat sends plain text now.

- [ ] **Step 1: Update `ChatPane.tsx`**

In `apps/resume-app/src/components/ChatPane.tsx`:

1. Replace the `STARTER_PROMPTS` array to remove `/skill:...` prefixes:

```ts
const STARTER_PROMPTS = [
  {
    icon: "▤",
    title: "现代科技风",
    subtitle: "双列 + 蓝色主色",
    prompt: "帮我把简历修改为适合投递字节跳动后端开发岗位的现代科技风格，突出微服务和 Go 语言的高并发优化经验。"
  },
  {
    icon: "▦",
    title: "投行咨询经典",
    subtitle: "单列 + 黑色系统字体",
    prompt: "帮我把简历整理成经典排版，适合投递中金公司或麦肯锡，加强量化数据指标，去掉无关的社团经历。"
  },
  {
    icon: "◈",
    title: "中英双语简历",
    subtitle: "多语言数据对齐",
    prompt: "将这份简历进行中英文翻译并排版，对齐中英文的岗位职责，保持 ATS 友好度。"
  }
];
```

2. Replace destructuring of `useChat()` and the call site:

```tsx
const { messages, pendingAssistantContent, status, errorMessage, sendMessage, cancel } = useChat();
```

3. Update `handleSend`:

```tsx
const handleSend = (text: string) => {
  void sendMessage(text);
};
```

4. In the message list rendering, if `pendingAssistantContent` is non-empty and `status === "writing"`, render an extra streaming bubble after the persisted messages:

```tsx
{pendingAssistantContent && status === "writing" && (
  <AssistantMessage
    message={{
      id: "pending",
      role: "assistant",
      content: pendingAssistantContent,
      createdAt: new Date().toISOString()
    }}
    onCardSubmit={() => {}}
  />
)}
```

5. Show error banner when `status === "error"`:

```tsx
{status === "error" && (
  <div className="mx-6 mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
    {errorMessage ?? "Something went wrong"}
  </div>
)}
```

6. Pass `cancel` instead of `cancelWorking`:

```tsx
<ChatComposer onSend={handleSend} onCancel={() => void cancel()} status={status === "thinking" || status === "writing" ? status : "idle"} />
```

- [ ] **Step 2: Update `ChatComposer.tsx`**

In `apps/resume-app/src/components/ChatComposer.tsx`:

1. Delete the `useConfig()` import and `showAgentMenu`/`setShowAgentMenu` state.
2. Delete the entire `<div className="relative">` block containing the AgentPicker dropdown.
3. Replace its place with a static placeholder chip (slice 7 will reintroduce a real picker):

```tsx
<span className="inline-flex items-center gap-1.5 rounded-xl bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink-500">
  <Sparkles className="w-3.5 h-3.5 text-brand-500" />
  Anthropic Sonnet 4.6 (BYOK)
</span>
```

4. Remove the `/skill:` regex parse — `onSend` now receives plain text:

```tsx
const handleSend = () => {
  if (!text.trim() || isWorking) return;
  onSend(text);
  setText("");
};
```

5. Adjust the `Props` interface so `onSend` is `(text: string) => void`.

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter resume-app typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/resume-app/src/components/ChatPane.tsx apps/resume-app/src/components/ChatComposer.tsx
git commit -m "refactor(web): chat pane sends plain text; remove mock agent picker"
```

---

## Task 18: Document `ANTHROPIC_API_KEY` setup

**Files:**
- Create: `apps/daemon/README.md`

- [ ] **Step 1: Write the README**

Create `apps/daemon/README.md`:

```markdown
# @resume-studio/daemon

Local Fastify daemon. Serves the web app's `/api/*` surface and brokers chat to Anthropic.

## Setup

```
export ANTHROPIC_API_KEY=sk-ant-...
export ANTHROPIC_MODEL=claude-sonnet-4-6   # optional
```

If `ANTHROPIC_API_KEY` is not set, `/api/health` reports `byokProviders: 0` and any
`POST /api/conversations/:projectId/messages` returns an `agent_failed` SSE error.

## Run

```
pnpm --filter @resume-studio/daemon dev
```

Listens on `http://127.0.0.1:17456` by default. Override with `OD_RESUME_PORT`.

## Routes (slice 2)

- `GET  /api/health`
- `GET  /api/skills` / `/api/skills/:id`
- `GET  /api/design-systems` / `/api/design-systems/:id`
- `GET  /api/projects` / `POST /api/projects` / `PATCH /api/projects/:id` / `DELETE /api/projects/:id` / `POST /api/projects/:id/duplicate` / `GET /api/projects/:id/state`
- `POST /api/conversations/:projectId/messages`  (queues a run)
- `GET  /api/conversations/:projectId/stream`     (consumes queued run as SSE)
- `POST /api/conversations/:projectId/cancel`

## Storage

JSON files under `RESUME_STUDIO_DATA_DIR` (default `.tmp/resume-studio`):

- `projects.json`
- `conversations/<projectId>.json`
```

- [ ] **Step 2: Commit**

```bash
git add apps/daemon/README.md
git commit -m "docs(daemon): document ANTHROPIC_API_KEY and slice-2 routes"
```

---

## Task 19: End-to-end manual verification

**Files:** none

- [ ] **Step 1: Start the daemon**

```bash
export ANTHROPIC_API_KEY=sk-ant-...
pnpm --filter @resume-studio/daemon dev
```

Expected console output: `Resume Studio daemon listening on http://127.0.0.1:17456`

- [ ] **Step 2: Start the web dev server**

In a second terminal:

```bash
pnpm --filter resume-app dev
```

Expected: Vite serves `http://localhost:5173`. Open the URL in a browser.

- [ ] **Step 3: Create a project**

In the EntryView, create a project named "Hello". You should land in ProjectView.

- [ ] **Step 4: Send a message**

Type "Say hi in five words" in the ChatComposer and press ⌘+Enter.

Expected:
- A user bubble appears immediately.
- Within ≤2s an assistant bubble starts streaming token-by-token.
- The status chip in ChatPane header shows "写入简历中" while streaming.
- When done, status returns to "空闲".

- [ ] **Step 5: Cancel mid-stream**

Send "List 100 fruits" and click the red Stop button while it streams.

Expected: stream halts, status returns to "空闲", a red error banner shows "Cancelled by user" (or similar).

- [ ] **Step 6: Reload, verify persistence**

Reload the page; navigate back into the same project. The full message history should appear (loaded via `GET /api/projects/<id>/state`).

- [ ] **Step 7: Commit a checkpoint marker (no code changes)**

If you discovered minor fixes during manual testing, fix them and commit. Otherwise:

```bash
git log --oneline -1
# Verify the last commit is from Task 18; no further commit needed.
```

---

## Task 20: Run the full test suite + typecheck

**Files:** none

- [ ] **Step 1: Run all daemon tests**

Run: `pnpm --filter @resume-studio/daemon test`
Expected: ALL PASS.

- [ ] **Step 2: Run all web tests**

Run: `pnpm --filter resume-app test`
Expected: ALL PASS.

- [ ] **Step 3: Run contracts tests**

Run: `pnpm --filter @resume-studio/contracts test`
Expected: ALL PASS.

- [ ] **Step 4: Run workspace typecheck**

Run: `pnpm typecheck`
Expected: PASS for all packages.

- [ ] **Step 5: Tag the slice completion**

```bash
git tag -a slice-2-chat-pipeline -m "Slice 2: SSE main chat pipeline + BYOK Anthropic adapter"
```

---

## Out of Scope (deferred to later slices)

- **CLI agent adapters** (Claude Code / Codex / Cursor Agent / Gemini CLI) — slice 7.
- **`tool_call` / `tool_done` / `todo_update` / `card` / `artifact_chunk` events** — defined in contracts but not emitted yet; slices 3 + 4 wire them.
- **AgentPicker UI** — slice 7. The composer currently shows a static "Anthropic Sonnet 4.6 (BYOK)" chip.
- **Keyring storage of API keys** — slice 10. Slice 2 reads `ANTHROPIC_API_KEY` from env only.
- **Multi-conversation per project** — slice 2 uses `conversation_id == project_id`. Adding multiple conversations is a future migration.
- **SQLite migration** — slice 10. JSON storage works fine for early users.
- **System prompts from skills + design systems** — slice 5/6 will inject `SKILL.md` content into the system prompt. Slice 2 sends user messages with no system prompt.
- **Privacy consent modal** — slice 7. For now, the docs are the consent surface.
- **Reconnection on SSE drop** — basic close-on-error only; resilient reconnect lands with slice 11.
- **Visual regression / Playwright E2E** — slice 12.

---

## Spec Coverage Self-Check

| Backend spec section | Covered by |
| --- | --- |
| §4.1 `POST /api/conversations/:id/messages` | Task 9 |
| §4.2 `GET /api/conversations/:id/stream` | Task 9 |
| §4.1 `POST /api/conversations/:id/cancel` | Task 9 |
| §10.1 SSE event union | Task 3 (encoder) + Task 5 (5 of 11 variants emitted) |
| §10.2 SSE wire format | Task 3 |
| §10.3 Orchestrator upstream dispatch | Task 7 |
| §10.4 Cancel via AbortSignal | Task 7 + Task 9 |
| §8.2 Anthropic BYOK adapter | Task 5 |
| §9.1 BYOK proxy route paths | Deferred — slice 2 uses in-process SDK, no `/api/proxy/*` route. Slice 9 can move to proxy if needed. |
| §14.2 `conversations` + `messages` tables | Task 6 (JSON files; SQLite is slice 10) |
| §16 Privacy/keyring | Deferred to slice 7/10; env-var only here |

| Frontend spec section | Covered by |
| --- | --- |
| §6.3 SSE stream client | Task 14 |
| §4.3 ChatAction reducer | Task 15 |
| §9.1 MessageRenderer switch | Existing `AssistantMessage.tsx` handles `user` + `assistant`; later slices add other variants |
| §9.3 ChatComposer | Task 17 |
| §13 AgentPicker | Stubbed to static label (Task 17); real impl is slice 7 |

| PRD section | Covered by |
| --- | --- |
| §8 Journey 1 (chat → assistant reply) | Task 19 step 4 |
| §9.4 AG-04 Agent failure → error in chat | Task 5 (error branch) + Task 15 (error state) |
| §10 "Local-first" / "BYOK at every layer" | Env-only key + in-process SDK |
