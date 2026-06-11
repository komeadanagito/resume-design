import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export type DaemonConfig = {
  anthropicApiKey: string;
  anthropicModel: string;
};

const DEFAULTS: DaemonConfig = {
  anthropicApiKey: "",
  anthropicModel: "claude-sonnet-4-6"
};

/**
 * Daemon-side config file (dataDir/config.json). The API key lives here —
 * never in browser storage. Keyring storage replaces this file in slice 10.
 */
export class ConfigStore {
  private readonly filePath: string;

  constructor(dataDir: string) {
    this.filePath = join(dataDir, "config.json");
  }

  async get(): Promise<DaemonConfig> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<DaemonConfig>;
      return { ...DEFAULTS, ...parsed };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { ...DEFAULTS };
      throw error;
    }
  }

  async update(patch: Partial<DaemonConfig>): Promise<DaemonConfig> {
    const current = await this.get();
    const next = { ...current, ...patch };
    await mkdir(dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tmp, `${JSON.stringify(next, null, 2)}\n`, "utf8");
    await rename(tmp, this.filePath);
    return next;
  }
}
