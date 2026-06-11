import { describe, expect, it } from "vitest";
import { AppErrorSchema, ProjectSchema, SendMessageRequestSchema, SseEventSchema } from "../src/index.js";

describe("contracts", () => {
  it("validates project summaries", () => {
    const parsed = ProjectSchema.parse({
      id: "proj_1",
      name: "Backend Resume",
      locale: "en-US",
      designSystemId: "neutral-modern",
      createdAt: "2026-06-11T00:00:00.000Z",
      updatedAt: "2026-06-11T00:00:00.000Z"
    });

    expect(parsed.name).toBe("Backend Resume");
  });

  it("validates SSE event variants", () => {
    expect(SseEventSchema.parse({ type: "done", durationMs: 7 }).type).toBe("done");
    expect(() => SseEventSchema.parse({ type: "done", durationMs: -1 })).toThrow();
  });

  it("validates app errors", () => {
    expect(AppErrorSchema.parse({ code: "not_found", message: "Missing", retry: false }).code).toBe("not_found");
  });
});

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
