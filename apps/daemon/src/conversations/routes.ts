import type { FastifyInstance, FastifyReply } from "fastify";
import { ZodError } from "zod";
import {
  AppErrorSchema,
  SendMessageRequestSchema,
  type AppError,
  type SseEvent
} from "@resume-studio/contracts";
import { runSseStream } from "../sse/streamer.js";
import type { ConversationOrchestrator } from "./orchestrator.js";
import type { ConversationStore } from "./store.js";

type RouteDeps = {
  orchestrator: ConversationOrchestrator;
  store: ConversationStore;
};

type QueuedRun = AsyncIterable<SseEvent>;

function sendError(reply: FastifyReply, statusCode: number, error: AppError) {
  return reply.code(statusCode).send(AppErrorSchema.parse(error));
}

export async function registerConversationRoutes(server: FastifyInstance, deps: RouteDeps) {
  // Per-server queue — created inside the closure so each createServer() call gets isolated state.
  const queued = new Map<string, QueuedRun>();

  server.post<{ Params: { projectId: string }; Body: unknown }>(
    "/api/conversations/:projectId/messages",
    async (request, reply) => {
      try {
        const body = SendMessageRequestSchema.parse(request.body ?? {});
        queued.set(request.params.projectId, deps.orchestrator.runOnce(request.params.projectId, body));
        return reply.code(202).send({ accepted: true });
      } catch (error) {
        if (error instanceof ZodError) {
          return sendError(reply, 400, {
            code: "validation_failed",
            message: "Invalid message payload",
            retry: false,
            details: error.flatten()
          });
        }
        throw error;
      }
    }
  );

  server.get<{ Params: { projectId: string } }>(
    "/api/conversations/:projectId/stream",
    async (request, reply) => {
      const run = queued.get(request.params.projectId);
      if (!run) {
        return sendError(reply, 409, {
          code: "bad_request",
          message: "No queued run; POST /messages first",
          retry: false
        });
      }
      queued.delete(request.params.projectId);

      reply.hijack();
      await runSseStream(reply.raw, run);
    }
  );

  server.post<{ Params: { projectId: string } }>(
    "/api/conversations/:projectId/cancel",
    async (request) => {
      const cancelled = deps.orchestrator.cancel(request.params.projectId);
      return { cancelled };
    }
  );
}
