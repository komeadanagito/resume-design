import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppErrorSchema } from "@resume-studio/contracts";
import type { ConfigStore, DaemonConfig } from "./store.js";

const UpdateConfigSchema = z
  .object({
    apiKey: z.string().trim().min(8).optional(),
    model: z.string().trim().min(1).optional()
  })
  .refine((value) => value.apiKey !== undefined || value.model !== undefined, {
    message: "at least one of apiKey / model is required"
  });

function redact(config: DaemonConfig) {
  return {
    hasApiKey: config.anthropicApiKey.length > 0,
    apiKeyLast4: config.anthropicApiKey ? config.anthropicApiKey.slice(-4) : undefined,
    model: config.anthropicModel
  };
}

export type ConfigRouteDeps = {
  store: ConfigStore;
};

export async function registerConfigRoutes(server: FastifyInstance, deps: ConfigRouteDeps) {
  server.get("/api/config", async () => redact(await deps.store.get()));

  server.put<{ Body: unknown }>("/api/config", async (request, reply) => {
    const parsed = UpdateConfigSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send(
        AppErrorSchema.parse({
          code: "validation_failed",
          message: "Invalid config payload",
          retry: false,
          details: parsed.error.flatten()
        })
      );
    }
    const next = await deps.store.update({
      ...(parsed.data.apiKey !== undefined ? { anthropicApiKey: parsed.data.apiKey } : {}),
      ...(parsed.data.model !== undefined ? { anthropicModel: parsed.data.model } : {})
    });
    return redact(next);
  });
}
