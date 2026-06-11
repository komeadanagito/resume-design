import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import {
  type CreateProjectRequest,
  ProjectSchema,
  type Project,
  type ProjectState,
  type UpdateProjectRequest
} from "@resume-studio/contracts";
import type { ArtifactStore } from "../artifacts/store.js";
import type { ConversationStore } from "../conversations/store.js";

type ProjectDatabase = {
  projects: Project[];
};

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix: string) {
  return `${prefix}_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
}

export class ProjectNotFoundError extends Error {
  constructor(id: string) {
    super(`Project not found: ${id}`);
    this.name = "ProjectNotFoundError";
  }
}

export type ProjectStoreDeps = {
  conversations?: ConversationStore;
  artifacts?: ArtifactStore;
};

export class ProjectStore {
  private readonly filePath: string;
  private readonly conversations?: ConversationStore;
  private readonly artifacts?: ArtifactStore;

  constructor(dataDir: string, deps: ProjectStoreDeps = {}) {
    this.filePath = join(dataDir, "projects.json");
    this.conversations = deps.conversations;
    this.artifacts = deps.artifacts;
  }

  async list(): Promise<Project[]> {
    const db = await this.read();
    return db.projects.filter((project) => !project.deletedAt);
  }

  async create(input: CreateProjectRequest): Promise<Project> {
    const db = await this.read();
    const timestamp = nowIso();
    const project = ProjectSchema.parse({
      id: newId("proj"),
      name: input.name,
      locale: input.locale,
      designSystemId: input.designSystemId,
      createdAt: timestamp,
      updatedAt: timestamp
    });

    db.projects.push(project);
    await this.write(db);
    return project;
  }

  async get(id: string): Promise<Project> {
    const db = await this.read();
    const project = db.projects.find((item) => item.id === id && !item.deletedAt);
    if (!project) throw new ProjectNotFoundError(id);
    return project;
  }

  async update(id: string, input: UpdateProjectRequest): Promise<Project> {
    const db = await this.read();
    const index = db.projects.findIndex((item) => item.id === id && !item.deletedAt);
    if (index === -1) throw new ProjectNotFoundError(id);

    const project = ProjectSchema.parse({
      ...db.projects[index],
      ...input,
      updatedAt: nowIso()
    });

    db.projects[index] = project;
    await this.write(db);
    return project;
  }

  async duplicate(id: string): Promise<Project> {
    const source = await this.get(id);
    return this.create({
      name: `${source.name} Copy`,
      locale: source.locale,
      designSystemId: source.designSystemId
    });
  }

  async delete(id: string): Promise<void> {
    const db = await this.read();
    const index = db.projects.findIndex((item) => item.id === id && !item.deletedAt);
    if (index === -1) throw new ProjectNotFoundError(id);

    db.projects[index] = ProjectSchema.parse({
      ...db.projects[index],
      deletedAt: nowIso(),
      updatedAt: nowIso()
    });
    await this.write(db);
  }

  async state(id: string): Promise<ProjectState> {
    const project = await this.get(id);
    const messages = this.conversations ? await this.conversations.listMessages(id) : [];
    const artifacts = this.artifacts ? await this.artifacts.list(id) : [];
    return { project, messages, artifacts };
  }

  private async read(): Promise<ProjectDatabase> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as ProjectDatabase;
      return { projects: parsed.projects.map((project) => ProjectSchema.parse(project)) };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") return { projects: [] };
      throw error;
    }
  }

  private async write(db: ProjectDatabase): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const tmpPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tmpPath, `${JSON.stringify(db, null, 2)}\n`, "utf8");
    await rename(tmpPath, this.filePath);
  }
}
