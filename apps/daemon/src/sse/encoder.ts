import type { SseEvent } from "@resume-studio/contracts";

export function encodeSseEvent(event: SseEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

export function encodeHeartbeat(): string {
  return `: ping\n\n`;
}
