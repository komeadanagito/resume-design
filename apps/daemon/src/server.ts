import Anthropic from "@anthropic-ai/sdk";
import Fastify, { type FastifyInstance } from "fastify";
import { AppErrorSchema, type AppError } from "@resume-studio/contracts";
import { createAnthropicAdapter } from "./anthropic/adapter.js";
import type { AnthropicLikeClient } from "./anthropic/types.js";
import type { AnthropicAdapter } from "./anthropic/adapter.js";
import { ArtifactStore } from "./artifacts/store.js";
import { registerConfigRoutes } from "./config/routes.js";
import { ConfigStore } from "./config/store.js";
import { loadDesignSystems, loadSkills, summarizeDesignSystem, summarizeSkill } from "./content-index.js";
import { ConversationOrchestrator } from "./conversations/orchestrator.js";
import { registerConversationRoutes } from "./conversations/routes.js";
import { ConversationStore } from "./conversations/store.js";
import { type DaemonOptions, resolveEnv } from "./env.js";
import { buildSystemPrompt } from "./prompts/system.js";
import { registerFilesRoutes } from "./projects/files-routes.js";
import { registerProjectRoutes } from "./projects/routes.js";
import { ProjectStore } from "./projects/store.js";

function appError(error: AppError, statusCode: number) {
  return { statusCode, body: AppErrorSchema.parse(error) };
}

const disabledClient: AnthropicLikeClient = {
  messages: {
    stream() {
      throw new Error("尚未配置 Anthropic API Key —— 请点击右上角设置，填入你的 API Key 后重试。");
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
  const artifactStore = new ArtifactStore(env.dataDir);
  const configStore = new ConfigStore(env.dataDir);
  const projectStore = new ProjectStore(env.dataDir, {
    conversations: conversationStore,
    artifacts: artifactStore
  });

  // Resolves the API key per run so a key saved through Settings takes
  // effect immediately, without a daemon restart. Env vars act as fallback.
  const dynamicAdapter: AnthropicAdapter = {
    async *run(input) {
      const config = await configStore.get();
      const apiKey = config.anthropicApiKey || env.anthropicApiKey;
      const model = config.anthropicModel || env.anthropicModel;
      const inner = createAnthropicAdapter({
        client: apiKey
          ? (new Anthropic({ apiKey }) as unknown as AnthropicLikeClient)
          : disabledClient,
        model
      });
      yield* inner.run(input);
    }
  };

  const orchestrator = new ConversationOrchestrator({
    store: conversationStore,
    adapter: dynamicAdapter,
    artifacts: artifactStore,
    systemPrompt: buildSystemPrompt(skills, designSystems)
  });

  server.get("/api/health", async () => {
    const config = await configStore.get();
    const hasKey = Boolean(config.anthropicApiKey || env.anthropicApiKey);
    return {
      status: "ok",
      version: "0.1.0",
      uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
      agents: { cliCount: 0, byokProviders: hasKey ? 1 : 0 },
      skills: skills.length,
      designSystems: designSystems.length
    };
  });

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
  await registerFilesRoutes(server, { dataDir: env.dataDir });
  await registerConfigRoutes(server, { store: configStore });

  return server;
}
