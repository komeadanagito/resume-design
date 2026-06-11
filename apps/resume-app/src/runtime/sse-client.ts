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
