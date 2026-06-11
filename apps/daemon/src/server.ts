import Anthropic from "@anthropic-ai/sdk";
import Fastify, { type FastifyInstance } from "fastify";
import { AppErrorSchema, type AppError } from "@resume-studio/contracts";
import { createAnthropicAdapter } from "./anthropic/adapter.js";
import type { AnthropicLikeClient } from "./anthropic/types.js";
import { loadDesignSystems, loadSkills, summarizeDesignSystem, summarizeSkill } from "./content-index.js";
import { ConversationOrchestrator } from "./conversations/orchestrator.js";
import { registerConversationRoutes } from "./conversations/routes.js";
import { ConversationStore } from "./conversations/store.js";
import { type DaemonOptions, resolveEnv } from "./env.js";
import { registerProjectRoutes } from "./projects/routes.js";
import { ProjectStore } from "./projects/store.js";

function appError(error: AppError, statusCode: number) {
  return { statusCode, body: AppErrorSchema.parse(error) };
}

const disabledClient: AnthropicLikeClient = {
  messages: {
    stream() {
      throw new Error("ANTHROPIC_API_KEY not set; configure it in your environment to enable chat.");
    }
  }
};

export async function createServer(options: DaemonOptions = {}): Promise<FastifyInstance> {
  const env = resolveEnv(options);
  const startedAt = Date.now();
  const server = Fastify({ logger: false });

  const skills = await loadSkills(env.rootDir);
  const designSystems = await loadDesignSystems(env.rootDir);
  const conversationStore = new ConversationStore(env.dataDir);
  const projectStore = new ProjectStore(env.dataDir, { conversations: conversationStore });

  const adapter = createAnthropicAdapter({
    client: env.anthropicApiKey
      ? (new Anthropic({ apiKey: env.anthropicApiKey }) as unknown as AnthropicLikeClient)
      : disabledClient,
    model: env.anthropicModel
  });
  const orchestrator = new ConversationOrchestrator({ store: conversationStore, adapter });

  server.get("/api/health", async () => ({
    status: "ok",
    version: "0.1.0",
    uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
    agents: { cliCount: 0, byokProviders: env.anthropicApiKey ? 1 : 0 },
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
  await registerConversationRoutes(server, { orchestrator, store: conversationStore });

  return server;
}
