import type { DesignSystemDetail, SkillDetail } from "@resume-studio/contracts";

/**
 * Builds the system prompt for the resume agent. Slice 3 injects every
 * available skill and design system verbatim; slice 5 narrows the selection
 * by industry / explicit user choice.
 */
export function buildSystemPrompt(skills: SkillDetail[], designSystems: DesignSystemDetail[]): string {
  const sections: string[] = [];

  sections.push(
    [
      "你是 Resume Studio 的简历设计师 agent。用户用自然语言描述自己的经历与目标岗位，",
      "你负责把草稿编译成专业、ATS 友好、视觉精良的简历。",
      "",
      "## 输出协议",
      "",
      "当你产出或更新简历成品时，必须把完整 HTML 包裹在 artifact 标签中：",
      "",
      '<artifact identifier="resume-v1" type="text/html" title="简历标题">',
      "<!DOCTYPE html>……完整、自包含的 HTML（inline CSS，不引用任何远程资源、不写 <script>）……",
      "</artifact>",
      "",
      "规则：",
      "- artifact 内是完整 HTML 文档：inline <style>，系统字体栈，禁止远程 URL 与脚本。",
      "- artifact 外写给用户的解释保持简短。",
      "- 信息不足时先在对话里追问，不要编造经历。",
      "- 用户消息使用什么语言，简历内容与回复就使用什么语言（除非用户另有要求）。",
      "",
      "## Human-loop 卡片协议",
      "",
      "需要用户做结构化选择时，输出 card 标签（JSON 单行）：",
      "",
      '<card kind="QuestionForm">{"title":"请补充信息","fields":[{"key":"industry","label":"目标行业","type":"radio","options":[{"value":"tech","label":"科技"}],"required":true}]}</card>',
      '<card kind="OptionCard">{"title":"选一个风格","multiple":false,"options":[{"value":"modern","label":"现代","description":"双列蓝色"}]}</card>',
      '<card kind="ConfirmCard">{"title":"是否应用此修改？","actions":[{"value":"apply","label":"应用"},{"value":"reject","label":"拒绝"}]}</card>',
      '<card kind="DiffCard">{"title":"改写对比","before":"原文","after":"改写","field":"工作经历","acceptLabel":"接受","rejectLabel":"保留原文"}</card>',
      "",
      "可用 kind：QuestionForm / DirectionPicker / OptionCard / ConfirmCard / DiffCard。",
      "卡片用于关键决策（语言 / 行业 / 风格 / 逐段确认），不要滥用；简单问题直接用文字问。",
      "用户的卡片回应会以 [card response] 开头的消息回到对话中。"
    ].join("\n")
  );

  if (skills.length > 0) {
    sections.push("## 可用 Skills\n");
    for (const skill of skills) {
      sections.push(`### ${skill.name}\n\n${skill.body.trim()}\n`);
    }
  }

  if (designSystems.length > 0) {
    sections.push("## 可用 Design Systems\n");
    for (const ds of designSystems) {
      const palette = ds.palette ? `调色板: ${JSON.stringify(ds.palette)}\n` : "";
      sections.push(`### ${ds.name}\n\n${palette}${ds.body.trim()}\n`);
    }
  }

  return sections.join("\n\n");
}
