import type { ChatMessage, SseEvent } from "@resume-studio/contracts";
import type { AnthropicLikeClient } from "./types.js";

export type AnthropicAdapterOptions = {
  client: AnthropicLikeClient;
  model: string;
  maxTokens?: number;
};

export type RunInput = {
  messages: Array<Pick<ChatMessage, "role" | "content">>;
  systemPrompt?: string;
  abortSignal: AbortSignal;
};

export type AnthropicAdapter = {
  run(input: RunInput): AsyncGenerator<SseEvent>;
};

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

export function createAnthropicAdapter(options: AnthropicAdapterOptions): AnthropicAdapter {
  const { client, model, maxTokens = 4096 } = options;

  return {
    async *run({ messages, systemPrompt, abortSignal }) {
      const messageId = makeId("msg");
      const startedAt = Date.now();
      let outputChars = 0;

      yield { type: "message_started", id: messageId, role: "assistant" };

      let stream: AsyncIterable<{ type: string; delta?: { type: string; text?: string } }>;
      try {
        stream = client.messages.stream({
          model,
          max_tokens: maxTokens,
          ...(systemPrompt ? { system: systemPrompt } : {}),
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
