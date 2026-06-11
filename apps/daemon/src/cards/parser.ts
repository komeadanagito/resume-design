import { randomUUID } from "node:crypto";
import { HumanLoopCardSchema, type HumanLoopCard } from "@resume-studio/contracts";

export type CardExtractionResult = {
  chatText: string;
  cards: HumanLoopCard[];
};

const CARD_RE = /<card\s+kind="([^"]+)"\s*>([\s\S]*?)<\/card>/g;

const KNOWN_KINDS = new Set(["QuestionForm", "DirectionPicker", "OptionCard", "ConfirmCard", "DiffCard"]);

function newId() {
  return `card_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
}

/**
 * In-band card protocol: the agent emits
 *   <card kind="QuestionForm">{ "title": "...", ...payload }</card>
 * inside its reply. Mirrors the artifact mechanism — extracted once at
 * message_completed, never streamed mid-tag.
 */
export function extractCards(text: string): CardExtractionResult {
  const cards: HumanLoopCard[] = [];
  const chatText = text
    .replace(CARD_RE, (_whole, kind: string, body: string) => {
      if (!KNOWN_KINDS.has(kind)) return "";
      try {
        const payload = JSON.parse(body.trim()) as Record<string, unknown>;
        const title = typeof payload.title === "string" && payload.title ? payload.title : kind;
        cards.push(
          HumanLoopCardSchema.parse({
            id: newId(),
            kind,
            title,
            payload
          })
        );
      } catch {
        // Malformed payloads are dropped — the prose around them survives.
      }
      return "";
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { chatText, cards };
}
