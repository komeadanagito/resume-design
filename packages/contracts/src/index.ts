import { z } from "zod";

export const IsoDateSchema = z.string().datetime();

export const ErrorCodeSchema = z.enum([
  "bad_request",
  "not_found",
  "conflict",
  "validation_failed",
  "agent_failed",
  "cancelled",
  "internal_error"
]);

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const AppErrorSchema = z.object({
  code: ErrorCodeSchema,
  message: z.string().min(1),
  retry: z.boolean().optional(),
  details: z.unknown().optional()
});

export type AppError = z.infer<typeof AppErrorSchema>;

export const LocaleSchema = z.enum(["zh-CN", "en-US"]);
export type Locale = z.infer<typeof LocaleSchema>;

export const ProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  locale: LocaleSchema,
  designSystemId: z.string().min(1).optional(),
  createdAt: IsoDateSchema,
  updatedAt: IsoDateSchema,
  deletedAt: IsoDateSchema.optional()
});

export type Project = z.infer<typeof ProjectSchema>;

export const CreateProjectRequestSchema = z.object({
  name: z.string().trim().min(1).default("Untitled Resume"),
  locale: LocaleSchema.default("en-US"),
  designSystemId: z.string().trim().min(1).optional()
});

export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;

export const UpdateProjectRequestSchema = z.object({
  name: z.string().trim().min(1).optional(),
  locale: LocaleSchema.optional(),
  designSystemId: z.string().trim().min(1).optional()
});

export type UpdateProjectRequest = z.infer<typeof UpdateProjectRequestSchema>;

export const ChatMessageSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["system", "user", "assistant", "tool"]),
  content: z.string(),
  createdAt: IsoDateSchema
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ArtifactSchema = z.object({
  id: z.string().min(1),
  tabId: z.string().min(1),
  title: z.string().min(1),
  mimeType: z.string().min(1),
  content: z.string(),
  createdAt: IsoDateSchema
});

export type Artifact = z.infer<typeof ArtifactSchema>;

export const ProjectStateSchema = z.object({
  project: ProjectSchema,
  messages: z.array(ChatMessageSchema),
  artifacts: z.array(ArtifactSchema)
});

export type ProjectState = z.infer<typeof ProjectStateSchema>;

export const SkillSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  version: z.string().optional(),
  rs: z.record(z.unknown()).optional(),
  preview: z.record(z.unknown()).optional()
});

export type SkillSummary = z.infer<typeof SkillSummarySchema>;

export const SkillDetailSchema = SkillSummarySchema.extend({
  body: z.string()
});

export type SkillDetail = z.infer<typeof SkillDetailSchema>;

export const DesignSystemSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  palette: z.record(z.string()).optional(),
  fonts: z.record(z.unknown()).optional(),
  industries: z.array(z.string()).optional(),
  preview: z.record(z.unknown()).optional()
});

export type DesignSystemSummary = z.infer<typeof DesignSystemSummarySchema>;

export const DesignSystemDetailSchema = DesignSystemSummarySchema.extend({
  body: z.string()
});

export type DesignSystemDetail = z.infer<typeof DesignSystemDetailSchema>;

export const AgentInfoSchema = z.object({
  id: z.string().min(1),
  source: z.enum(["cli", "byok"]),
  name: z.string().min(1),
  version: z.string().optional(),
  status: z.enum(["healthy", "not_installed", "broken", "not_configured"]),
  capabilities: z.object({
    streaming: z.boolean(),
    tools: z.boolean(),
    images: z.boolean()
  }),
  provider: z.enum(["anthropic", "openai", "azure", "google"]).optional(),
  model: z.string().optional()
});

export type AgentInfo = z.infer<typeof AgentInfoSchema>;

export const TodoSchema = z.object({
  id: z.string().min(1),
  content: z.string().min(1),
  status: z.enum(["pending", "in_progress", "completed"])
});

export type Todo = z.infer<typeof TodoSchema>;

export const HumanLoopCardSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["QuestionForm", "DirectionPicker", "OptionCard", "ConfirmCard", "DiffCard"]),
  title: z.string().min(1),
  payload: z.unknown()
});

export type HumanLoopCard = z.infer<typeof HumanLoopCardSchema>;

export const ArtifactMetaSchema = z.object({
  title: z.string().optional(),
  mimeType: z.string().optional()
});

export const SendMessageRequestSchema = z.object({
  text: z.string().trim().min(1, "text must be non-empty")
});

export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>;

export const SseEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("message_started"), id: z.string().min(1), role: z.literal("assistant") }),
  z.object({ type: z.literal("message_delta"), id: z.string().min(1), delta: z.string() }),
  z.object({ type: z.literal("message_completed"), id: z.string().min(1) }),
  z.object({ type: z.literal("tool_call"), id: z.string().min(1), tool: z.string().min(1), args: z.unknown() }),
  z.object({ type: z.literal("tool_done"), id: z.string().min(1), output: z.unknown() }),
  z.object({ type: z.literal("todo_update"), todos: z.array(TodoSchema) }),
  z.object({ type: z.literal("card"), card: HumanLoopCardSchema }),
  z.object({ type: z.literal("artifact_chunk"), tabId: z.string().min(1), delta: z.string(), meta: ArtifactMetaSchema.optional() }),
  z.object({ type: z.literal("artifact_done"), tabId: z.string().min(1), final: ArtifactSchema }),
  z.object({ type: z.literal("error"), code: ErrorCodeSchema, message: z.string().min(1), retry: z.boolean().optional() }),
  z.object({
    type: z.literal("done"),
    durationMs: z.number().int().nonnegative(),
    tokensIn: z.number().int().nonnegative().optional(),
    tokensOut: z.number().int().nonnegative().optional()
  })
]);

export type SseEvent = z.infer<typeof SseEventSchema>;
