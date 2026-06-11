import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { ChatMessageSchema, type ChatMessage } from "@resume-studio/contracts";

type ConversationFile = {
  projectId: string;
  messages: ChatMessage[];
};

function nowIso() {
  return new Date().toISOString();
}

function newId() {
  return `msg_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
}

export class ConversationStore {
  private readonly dir: string;

  constructor(dataDir: string) {
    this.dir = join(dataDir, "conversations");
  }

  async listMessages(projectId: string): Promise<ChatMessage[]> {
    const file = await this.read(projectId);
    return file.messages;
  }

  async append(
    projectId: string,
    input: Pick<ChatMessage, "role" | "content">
  ): Promise<ChatMessage> {
    const file = await this.read(projectId);
    const message = ChatMessageSchema.parse({
      id: newId(),
      role: input.role,
      content: input.content,
      createdAt: nowIso()
    });
    file.messages.push(message);
    await this.write(projectId, file);
    return message;
  }

  private path(projectId: string): string {
    return join(this.dir, `${projectId}.json`);
  }

  private async read(projectId: string): Promise<ConversationFile> {
    try {
      const raw = await readFile(this.path(projectId), "utf8");
      const parsed = JSON.parse(raw) as ConversationFile;
      return {
        projectId,
        messages: parsed.messages.map((message) => ChatMessageSchema.parse(message))
      };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") return { projectId, messages: [] };
      throw error;
    }
  }

  private async write(projectId: string, file: ConversationFile): Promise<void> {
    const target = this.path(projectId);
    await mkdir(dirname(target), { recursive: true });
    const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tmp, `${JSON.stringify(file, null, 2)}\n`, "utf8");
    await rename(tmp, target);
  }
}
