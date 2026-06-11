import Fastify, { type FastifyInstance } from "fastify";
import { AppErrorSchema, type AppError } from "@resume-studio/contracts";
import { loadDesignSystems, loadSkills, summarizeDesignSystem, summarizeSkill } from "./content-index.js";
import { type DaemonOptions, resolveEnv } from "./env.js";
import { registerProjectRoutes } from "./projects/routes.js";
import { ProjectStore } from "./projects/store.js";

function appError(error: AppError, statusCode: number) {
  return { statusCode, body: AppErrorSchema.parse(error) };
}

export async function createServer(options: DaemonOptions = {}): Promise<FastifyInstance> {
  const env = resolveEnv(options);
  const startedAt = Date.now();
  const server = Fastify({ logger: false });

  const skills = await loadSkills(env.rootDir);
  const designSystems = await loadDesignSystems(env.rootDir);
  const projectStore = new ProjectStore(env.dataDir);

  server.get("/api/health", async () => ({
    status: "ok",
    version: "0.1.0",
    uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
    agents: { cliCount: 0, byokProviders: 0 },
    skills: skills.length,
    designSystems: designSystems.length
  }));

  server.get("/api/skills", async () => skills.map(summarizeSkill));

  server.get<{ Params: { id: string } }>("/api/skills/:id", async (request, reply) => {
    const skill = skills.find((item) => item.id === request.params.id);
    if (!skill) {
      const error = appError({ code: "not_found", message: `Skill not found: ${request.params.id}`, retry: false }, 404);
      return reply.code(error.statusCode).send(error.body);
    }
    return skill;
  });

  server.get("/api/design-systems", async () => designSystems.map(summarizeDesignSystem));

  server.get<{ Params: { id: string } }>("/api/design-systems/:id", async (request, reply) => {
    const designSystem = designSystems.find((item) => item.id === request.params.id);
    if (!designSystem) {
      const error = appError(
        { code: "not_found", message: `Design system not found: ${request.params.id}`, retry: false },
        404
      );
      return reply.code(error.statusCode).send(error.body);
    }
    return designSystem;
  });

  await registerProjectRoutes(server, projectStore);

  return server;
}
