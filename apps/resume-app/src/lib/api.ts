import type { AppError, Project, ProjectState, SendMessageRequest } from '@resume-studio/contracts';

export class ApiError extends Error {
  readonly app: AppError;
  readonly status: number;

  constructor(status: number, app: AppError) {
    super(app.message);
    this.app = app;
    this.status = status;
  }
}

async function parse<T>(response: Response): Promise<T> {
  if (response.ok) return (await response.json()) as T;
  let payload: AppError;
  try {
    payload = (await response.json()) as AppError;
  } catch {
    payload = { code: 'internal_error', message: response.statusText || 'Network error', retry: false };
  }
  throw new ApiError(response.status, payload);
}

export async function listProjects(): Promise<Project[]> {
  return parse(await fetch('/api/projects'));
}

export async function createProjectApi(input: {
  name: string;
  locale: string;
  designSystemId?: string;
}): Promise<Project> {
  return parse(
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
  );
}

export async function patchProjectApi(id: string, patch: Partial<Pick<Project, 'name' | 'locale' | 'designSystemId'>>): Promise<Project> {
  return parse(
    await fetch(`/api/projects/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
  );
}

export async function deleteProjectApi(id: string): Promise<void> {
  const response = await fetch(`/api/projects/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!response.ok && response.status !== 204) await parse(response);
}

export async function duplicateProjectApi(id: string): Promise<Project> {
  return parse(await fetch(`/api/projects/${encodeURIComponent(id)}/duplicate`, { method: 'POST' }));
}

export async function getProjectState(projectId: string): Promise<ProjectState> {
  return parse(await fetch(`/api/projects/${encodeURIComponent(projectId)}/state`));
}

export async function sendMessage(projectId: string, body: SendMessageRequest): Promise<void> {
  const response = await fetch(`/api/conversations/${encodeURIComponent(projectId)}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (response.status !== 202) await parse(response);
}

export async function cancelRun(projectId: string): Promise<{ cancelled: boolean }> {
  return parse(await fetch(`/api/conversations/${encodeURIComponent(projectId)}/cancel`, { method: 'POST' }));
}
