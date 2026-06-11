import { describe, expect, it } from "vitest";
import { extractCards } from "../src/cards/parser.js";

describe("extractCards", () => {
  it("returns original text when no card tags present", () => {
    const result = extractCards("plain answer");
    expect(result.cards).toEqual([]);
    expect(result.chatText).toBe("plain answer");
  });

  it("extracts a question_form card with JSON payload", () => {
    const payload = {
      title: "请补充信息",
      fields: [{ key: "industry", label: "目标行业", type: "radio", options: [{ value: "tech", label: "科技" }] }]
    };
    const text = `我需要先确认两件事：\n<card kind="QuestionForm">${JSON.stringify(payload)}</card>`;

    const result = extractCards(text);
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].kind).toBe("QuestionForm");
    expect(result.cards[0].title).toBe("请补充信息");
    expect(result.chatText).toBe("我需要先确认两件事：");
  });

  it("ignores malformed JSON inside card tags", () => {
    const text = '<card kind="ConfirmCard">{not json</card>正文';
    const result = extractCards(text);
    expect(result.cards).toEqual([]);
    expect(result.chatText).toContain("正文");
  });

  it("rejects unknown card kinds", () => {
    const text = '<card kind="EvilCard">{"title":"x"}</card>';
    const result = extractCards(text);
    expect(result.cards).toEqual([]);
  });
});
