import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import type { FastifyInstance, FastifyReply } from "fastify";
import { AppErrorSchema, type AppError } from "@resume-studio/contracts";

function sendError(reply: FastifyReply, statusCode: number, error: AppError) {
  return reply.code(statusCode).send(AppErrorSchema.parse(error));
}

// Workspace files are flat (resume.html / artifacts.json / …) in slice 3 —
// nested paths and uploads land with the references/ folder in slice 9.
const SAFE_NAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

export type FilesRouteDeps = {
  dataDir: string;
};

export async function registerFilesRoutes(server: FastifyInstance, deps: FilesRouteDeps) {
  const projectDir = (projectId: string) => join(deps.dataDir, "projects", projectId);

  server.get<{ Params: { projectId: string } }>(
    "/api/projects/:projectId/files",
    async (request) => {
      try {
        const entries = await readdir(projectDir(request.params.projectId));
        const files = [];
        for (const name of entries) {
          const info = await stat(join(projectDir(request.params.projectId), name));
          if (info.isFile()) files.push({ name, size: info.size, modifiedAt: info.mtime.toISOString() });
        }
        return files;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
        throw error;
      }
    }
  );

  server.get<{ Params: { projectId: string; name: string } }>(
    "/api/projects/:projectId/files/:name",
    async (request, reply) => {
      const { projectId, name } = request.params;
      if (!SAFE_NAME.test(name)) {
        return sendError(reply, 400, { code: "bad_request", message: `Invalid file name: ${name}`, retry: false });
      }
      try {
        const content = await readFile(join(projectDir(projectId), name), "utf8");
        return { name, content };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          return sendError(reply, 404, { code: "not_found", message: `File not found: ${name}`, retry: false });
        }
        throw error;
      }
    }
  );
}
