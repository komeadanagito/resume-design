import { describe, expect, it } from "vitest";
import { extractArtifacts, sanitizeArtifactHtml } from "../src/artifacts/parser.js";

describe("extractArtifacts", () => {
  it("returns original text and no artifacts when none present", () => {
    const result = extractArtifacts("Just a plain answer.");
    expect(result.artifacts).toEqual([]);
    expect(result.chatText).toBe("Just a plain answer.");
  });

  it("extracts a single artifact and strips it from chat text", () => {
    const text = [
      "好的，这是你的简历：",
      '<artifact identifier="resume-v1" type="text/html" title="现代科技简历">',
      "<!DOCTYPE html><html><body><h1>张三</h1></body></html>",
      "</artifact>",
      "已完成，可在右侧预览。"
    ].join("\n");

    const result = extractArtifacts(text);
    expect(result.artifacts).toHaveLength(1);
    expect(result.artifacts[0]).toMatchObject({
      identifier: "resume-v1",
      type: "text/html",
      title: "现代科技简历"
    });
    expect(result.artifacts[0].content).toContain("<h1>张三</h1>");
    expect(result.chatText).toContain("好的，这是你的简历：");
    expect(result.chatText).toContain("已完成，可在右侧预览。");
    expect(result.chatText).not.toContain("<artifact");
  });

  it("handles missing optional title", () => {
    const text = '<artifact identifier="r1" type="text/html">x</artifact>';
    const result = extractArtifacts(text);
    expect(result.artifacts[0].title).toBe("r1");
  });
});

describe("sanitizeArtifactHtml", () => {
  it("strips script tags and on* handlers", () => {
    const dirty = '<div onclick="evil()">ok</div><script>alert(1)</script>';
    const clean = sanitizeArtifactHtml(dirty);
    expect(clean).not.toContain("<script");
    expect(clean).not.toContain("onclick");
    expect(clean).toContain("ok");
  });

  it("strips iframes and remote stylesheets", () => {
    const dirty = '<iframe src="https://x.com"></iframe><link rel="stylesheet" href="https://cdn.evil/x.css"><p>hi</p>';
    const clean = sanitizeArtifactHtml(dirty);
    expect(clean).not.toContain("<iframe");
    expect(clean).not.toContain("cdn.evil");
    expect(clean).toContain("<p>hi</p>");
  });
});
