import type { ChatMessage, SseEvent } from "@resume-studio/contracts";
import type { AnthropicAdapter } from "../anthropic/adapter.js";
import { extractArtifacts } from "../artifacts/parser.js";
import type { ArtifactStore } from "../artifacts/store.js";
import { ConversationStore } from "./store.js";

export type OrchestratorOptions = {
  store: ConversationStore;
  adapter: AnthropicAdapter;
  artifacts?: ArtifactStore;
  systemPrompt?: string;
};

export class ConversationOrchestrator {
  private readonly store: ConversationStore;
  private readonly adapter: AnthropicAdapter;
  private readonly artifacts?: ArtifactStore;
  private readonly systemPrompt?: string;
  private readonly inflight = new Map<string, AbortController>();

  constructor(options: OrchestratorOptions) {
    this.store = options.store;
    this.adapter = options.adapter;
    this.artifacts = options.artifacts;
    this.systemPrompt = options.systemPrompt;
  }

  async *runOnce(projectId: string, input: { text: string }): AsyncGenerator<SseEvent> {
    const controller = new AbortController();
    this.inflight.set(projectId, controller);

    try {
      await this.store.append(projectId, { role: "user", content: input.text });
      const history = await this.store.listMessages(projectId);

      let assistantBuffer = "";
      let completedId: string | null = null;

      const stream = this.adapter.run({
        messages: history.map((message): Pick<ChatMessage, "role" | "content"> => ({
          role: message.role,
          content: message.content
        })),
        systemPrompt: this.systemPrompt,
        abortSignal: controller.signal
      });

      for await (const event of stream) {
        if (event.type === "message_delta") {
          assistantBuffer += event.delta;
          yield event;
          continue;
        }

        if (event.type === "message_completed") {
          completedId = event.id;
          // Extract artifacts once the full reply is known; chat history keeps
          // only the prose, the artifact body lands in the ArtifactStore.
          const { chatText, artifacts } = extractArtifacts(assistantBuffer);
          await this.store.append(projectId, {
            role: "assistant",
            content: chatText || assistantBuffer
          });
          yield event;
          if (this.artifacts) {
            for (const extracted of artifacts) {
              const saved = await this.artifacts.save(projectId, extracted);
              yield { type: "artifact_done", tabId: saved.tabId, final: saved };
            }
          }
          continue;
        }

        yield event;
      }

      if (!completedId && assistantBuffer.length > 0) {
        // Stream aborted mid-flight: keep whatever prose arrived.
        const { chatText } = extractArtifacts(assistantBuffer);
        await this.store.append(projectId, { role: "assistant", content: chatText || assistantBuffer });
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
