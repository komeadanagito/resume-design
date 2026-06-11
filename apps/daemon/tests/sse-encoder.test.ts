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
