import type { FastifyInstance, FastifyReply } from "fastify";
import { ZodError } from "zod";
import {
  AppErrorSchema,
  CreateProjectRequestSchema,
  UpdateProjectRequestSchema,
  type AppError
} from "@resume-studio/contracts";
import { ProjectNotFoundError, ProjectStore } from "./store.js";

function sendError(reply: FastifyReply, statusCode: number, error: AppError) {
  return reply.code(statusCode).send(AppErrorSchema.parse(error));
}

function mapProjectError(reply: FastifyReply, error: unknown) {
  if (error instanceof ProjectNotFoundError) {
    return sendError(reply, 404, { code: "not_found", message: error.message, retry: false });
  }

  if (error instanceof ZodError) {
    return sendError(reply, 400, {
      code: "validation_failed",
      message: "Invalid project payload",
      retry: false,
      details: error.flatten()
    });
  }

  throw error;
}

export async function registerProjectRoutes(server: FastifyInstance, store: ProjectStore) {
  server.get("/api/projects", async () => store.list());

  server.post("/api/projects", async (request, reply) => {
    try {
      const input = CreateProjectRequestSchema.parse(request.body ?? {});
      const project = await store.create(input);
      return reply.code(201).send(project);
    } catch (error) {
      return mapProjectError(reply, error);
    }
  });

  server.get<{ Params: { id: string } }>("/api/projects/:id", async (request, reply) => {
    try {
      return await store.get(request.params.id);
    } catch (error) {
      return mapProjectError(reply, error);
    }
  });

  server.patch<{ Params: { id: string } }>("/api/projects/:id", async (request, reply) => {
    try {
      const input = UpdateProjectRequestSchema.parse(request.body ?? {});
      return await store.update(request.params.id, input);
    } catch (error) {
      return mapProjectError(reply, error);
    }
  });

  server.delete<{ Params: { id: string } }>("/api/projects/:id", async (request, reply) => {
    try {
      await store.delete(request.params.id);
      return reply.code(204).send();
    } catch (error) {
      return mapProjectError(reply, error);
    }
  });

  server.post<{ Params: { id: string } }>("/api/projects/:id/duplicate", async (request, reply) => {
    try {
      const project = await store.duplicate(request.params.id);
      return reply.code(201).send(project);
    } catch (error) {
      return mapProjectError(reply, error);
    }
  });

  server.get<{ Params: { id: string } }>("/api/projects/:id/state", async (request, reply) => {
    try {
      return await store.state(request.params.id);
    } catch (error) {
      return mapProjectError(reply, error);
    }
  });
}
