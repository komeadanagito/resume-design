export type ExecMode = 'daemon' | 'api';
export type ApiProtocol = 'anthropic' | 'openai' | 'azure' | 'google';

export type AppTheme = 'system' | 'light' | 'dark';

export interface AppConfig {
  mode: ExecMode;
  apiKey: string;
  baseUrl: string;
  model: string;
  apiProtocol?: ApiProtocol;
  theme?: AppTheme;
  accentColor?: string;
  agentId: string | null;
  designSystemId: string | null;
  onboardingCompleted?: boolean;
  privacyDecisionAt?: number | null;
  installationId?: string | null;
}

export interface ProjectMetadata {
  promptTemplate?: {
    id: string;
    prompt: string;
  };
}

// Project mirrors the daemon's contracts ProjectSchema (ISO-8601 timestamps).
// Slice-5 will reintroduce per-project skill binding through the chat protocol.
export type { Project, Locale, ProjectState, SendMessageRequest, SseEvent, AppError } from '@resume-studio/contracts';

export interface Conversation {
  id: string;
  projectId: string;
  title: string;
  createdAt: number;
}

export type ChatRole = 'user' | 'assistant' | 'system' | 'tool_call' | 'todo_update' | 'question_form' | 'direction_pick' | 'option_card' | 'confirm_card' | 'diff_card' | 'error' | 'done';

export interface ChatAttachment {
  path: string;
  name: string;
  kind: 'image' | 'file';
  size?: number;
}

export interface ChatCommentAttachment {
  id: string;
  filePath: string;
  elementId: string;
  comment: string;
}

export interface Todo {
  id: string;
  text: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

export interface ToolCall {
  id: string;
  name: string;
  input: unknown;
  status: 'pending' | 'done' | 'error';
  output?: unknown;
}

export type CardStatus = 'pending' | 'responded' | 'cancelled' | 'expired';

export interface CardBase {
  id: string;
  conversationId: string;
  createdAt: number;
  status: CardStatus;
  prompt: string;
}

export interface QuestionFormField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'radio' | 'checkbox' | 'textarea';
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
  placeholder?: string;
}

export interface QuestionFormCard extends CardBase {
  kind: 'question_form';
  fields: QuestionFormField[];
}

export interface Direction {
  id: string;
  name: string;
  thumbnail: string;
  palette: string[];
  fonts: { display: string; body: string };
}

export interface DirectionPickerCard extends CardBase {
  kind: 'direction_pick';
  directions: Direction[];
  allowOverride: boolean;
}

export interface OptionCardData extends CardBase {
  kind: 'option_card';
  multiple: boolean;
  options: Array<{ value: string; label: string; description?: string }>;
}

export interface ConfirmCardData extends CardBase {
  kind: 'confirm_card';
  actions: Array<{
    value: 'apply' | 'reject' | 'modify';
    label: string;
    variant?: 'primary' | 'danger' | 'secondary';
  }>;
}

export interface DiffCardData extends CardBase {
  kind: 'diff_card';
  before: string;
  after: string;
  field: string;
  acceptLabel: string;
  rejectLabel: string;
}

export type HumanLoopCard =
  | QuestionFormCard
  | DirectionPickerCard
  | OptionCardData
  | ConfirmCardData
  | DiffCardData;

export interface PersistedAgentEvent {
  kind: 'status' | 'text' | 'thinking' | 'usage' | 'tool_use' | 'tool_result';
  label?: string;
  text?: string;
  delta?: string;
  toolUseId?: string;
  content?: string;
  isError?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  kind: ChatRole; // Extends role to specific kinds for rendering
  content: string;
  agentId?: string;
  agentName?: string;
  events?: PersistedAgentEvent[];
  createdAt?: number;
  card?: HumanLoopCard;
  todos?: Todo[];
  toolCall?: ToolCall;
  error?: {
    code: string;
    message: string;
  };
}

export interface AgentInfo {
  id: string;
  source: 'cli' | 'byok';
  name: string;
  version?: string;
  status: 'healthy' | 'not_installed' | 'broken' | 'not_configured';
  capabilities: {
    streaming: boolean;
    tools: boolean;
    images: boolean;
  };
}

export interface SkillSummary {
  id: string;
  name: string;
  description: string;
  scenario: 'style' | 'capability' | 'utility';
  targetRole: string[];
  atsTarget: 'low' | 'medium' | 'high';
  examplePrompt?: string;
  previewThumbnail?: string;
}

export interface DesignSystemSummary {
  id: string;
  name: string;
  description: string;
  palette: {
    primary: string;
    ink: string;
    surface: string;
    accent: string;
  };
  fonts: {
    display: string;
    body: string;
  };
  industries: string[];
  defaultFor?: boolean;
}

export interface Artifact {
  id: string;
  projectId: string;
  version: number;
  tabId: string;
  identifier: string;
  type: string;
  title: string;
  filePath: string;
  isFinal: boolean;
  createdAt: number;
  html?: string;
}

export type LiveArtifactTabId = `live:${string}`;
export type ProjectWorkspaceTabId = string | LiveArtifactTabId;

export function liveArtifactTabId(artifactId: string): LiveArtifactTabId {
  return `live:${artifactId}`;
}

export function isLiveArtifactTabId(tabId: string): tabId is LiveArtifactTabId {
  return tabId.startsWith('live:') && tabId.length > 'live:'.length;
}

export function liveArtifactIdFromTabId(tabId: LiveArtifactTabId): string {
  return tabId.slice('live:'.length);
}

export interface OpenTabsState {
  tabs: string[];
  active: string | null;
}
