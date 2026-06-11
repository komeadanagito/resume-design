import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type DaemonOptions = {
  rootDir?: string;
  dataDir?: string;
  port?: number;
};

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

export function resolveEnv(options: DaemonOptions = {}) {
  const rootDir = resolve(options.rootDir ?? repoRoot);
  const dataDir = resolve(options.dataDir ?? process.env.RESUME_STUDIO_DATA_DIR ?? ".tmp/resume-studio");
  const port = options.port ?? Number(process.env.OD_RESUME_PORT ?? 17456);

  return { rootDir, dataDir, port };
}
