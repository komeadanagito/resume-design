import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  DesignSystemDetailSchema,
  type DesignSystemDetail,
  type DesignSystemSummary,
  SkillDetailSchema,
  type SkillDetail,
  type SkillSummary
} from "@resume-studio/contracts";

type FrontmatterValue = string | string[] | FrontmatterObject;

type FrontmatterObject = {
  [key: string]: FrontmatterValue;
};

function parseScalar(value: string): string | string[] {
  const trimmed = value.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    const inner = trimmed.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((item) => item.trim().replace(/^["']|["']$/g, ""));
  }

  return trimmed.replace(/^["']|["']$/g, "");
}

function setNested(target: Record<string, FrontmatterValue>, path: string[], value: FrontmatterValue) {
  let cursor = target;
  for (const segment of path.slice(0, -1)) {
    const existing = cursor[segment];
    if (!existing || typeof existing !== "object" || Array.isArray(existing)) {
      cursor[segment] = {};
    }
    cursor = cursor[segment] as Record<string, FrontmatterValue>;
  }
  cursor[path[path.length - 1] ?? ""] = value;
}

export function parseMarkdownWithFrontmatter(markdown: string) {
  if (!markdown.startsWith("---\n")) {
    return { data: {}, body: markdown.trimStart() };
  }

  const end = markdown.indexOf("\n---", 4);
  if (end === -1) {
    return { data: {}, body: markdown.trimStart() };
  }

  const raw = markdown.slice(4, end);
  const data: Record<string, FrontmatterValue> = {};
  const stack: Array<{ indent: number; path: string[] }> = [{ indent: -1, path: [] }];

  for (const line of raw.split("\n")) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;

    const indent = line.match(/^ */)?.[0].length ?? 0;
    const trimmed = line.trim();
    const separator = trimmed.indexOf(":");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();

    while (stack.length > 1 && indent <= stack[stack.length - 1]!.indent) {
      stack.pop();
    }

    const parentPath = stack[stack.length - 1]!.path;
    const path = [...parentPath, key];

    if (!rawValue) {
      setNested(data, path, {});
      stack.push({ indent, path });
    } else {
      setNested(data, path, parseScalar(rawValue));
    }
  }

  return { data, body: markdown.slice(end + 4).trimStart() };
}

async function readEntries(rootDir: string, folderName: string, fileName: string) {
  const folder = join(rootDir, folderName);
  let entries: string[];
  try {
    entries = await readdir(folder);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return [];
    throw error;
  }

  const details = [];
  for (const entry of entries) {
    const markdown = await readFile(join(folder, entry, fileName), "utf8").catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return undefined;
      throw error;
    });
    if (!markdown) continue;

    const parsed = parseMarkdownWithFrontmatter(markdown);
    details.push({ id: entry, ...parsed.data, body: parsed.body });
  }

  return details;
}

export async function loadSkills(rootDir: string): Promise<SkillDetail[]> {
  const entries = await readEntries(rootDir, "skills", "SKILL.md");
  return entries.map((entry) => SkillDetailSchema.parse(entry));
}

export async function loadDesignSystems(rootDir: string): Promise<DesignSystemDetail[]> {
  const entries = await readEntries(rootDir, "design-systems", "DESIGN.md");
  return entries.map((entry) => DesignSystemDetailSchema.parse(entry));
}

export function summarizeSkill(skill: SkillDetail): SkillSummary {
  const { body: _body, ...summary } = skill;
  return summary;
}

export function summarizeDesignSystem(designSystem: DesignSystemDetail): DesignSystemSummary {
  const { body: _body, ...summary } = designSystem;
  return summary;
}
