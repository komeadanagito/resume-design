import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { ArtifactSchema, type Artifact } from "@resume-studio/contracts";
import type { ExtractedArtifact } from "./parser.js";

type ArtifactIndexFile = {
  projectId: string;
  artifacts: Artifact[];
};

function nowIso() {
  return new Date().toISOString();
}

function newId() {
  return `art_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
}

function fileNameFor(identifier: string): string {
  // The latest text/html artifact always lands at resume.html so exports and
  // the workspace tree have a stable entry point.
  return identifier.startsWith("resume") ? "resume.html" : `${identifier}.html`;
}

export class ArtifactStore {
  private readonly dataDir: string;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
  }

  async save(projectId: string, input: ExtractedArtifact): Promise<Artifact> {
    const index = await this.read(projectId);
    const artifact = ArtifactSchema.parse({
      id: newId(),
      tabId: input.identifier,
      title: input.title,
      mimeType: input.type,
      content: input.content,
      createdAt: nowIso()
    });

    // One live entry per tabId — newest replaces the previous version.
    index.artifacts = [...index.artifacts.filter((a) => a.tabId !== input.identifier), artifact];
    await this.write(projectId, index);

    const filePath = join(this.projectDir(projectId), fileNameFor(input.identifier));
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, input.content, "utf8");

    return artifact;
  }

  async list(projectId: string): Promise<Artifact[]> {
    const index = await this.read(projectId);
    return index.artifacts;
  }

  private projectDir(projectId: string): string {
    return join(this.dataDir, "projects", projectId);
  }

  private indexPath(projectId: string): string {
    return join(this.projectDir(projectId), "artifacts.json");
  }

  private async read(projectId: string): Promise<ArtifactIndexFile> {
    try {
      const raw = await readFile(this.indexPath(projectId), "utf8");
      const parsed = JSON.parse(raw) as ArtifactIndexFile;
      return { projectId, artifacts: parsed.artifacts.map((a) => ArtifactSchema.parse(a)) };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") return { projectId, artifacts: [] };
      throw error;
    }
  }

  private async write(projectId: string, index: ArtifactIndexFile): Promise<void> {
    const target = this.indexPath(projectId);
    await mkdir(dirname(target), { recursive: true });
    const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tmp, `${JSON.stringify(index, null, 2)}\n`, "utf8");
    await rename(tmp, target);
  }
}
