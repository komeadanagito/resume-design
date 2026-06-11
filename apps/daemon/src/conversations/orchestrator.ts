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
      await this.store.append(projectId, { role: "user", content: input.text });
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
