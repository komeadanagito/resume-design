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
