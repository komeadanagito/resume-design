// Thin, typed wrappers around Tauri's `invoke`. Every command exposed by the
// Rust side gets one function here. UI code never calls `invoke` directly.
//
// Adding a new command: add a wrapper in this file plus a matching
// `#[tauri::command]` on the Rust side. Keep this file small and boring.

import { invoke } from "@tauri-apps/api/core";
import type { Resume } from "./types/Resume";

export type AppErrorCode = "io" | "json" | "schema" | "path";
export type AppError = { code: AppErrorCode; message: string };

export async function loadResume(path?: string): Promise<Resume> {
  return invoke<Resume>("load_resume", { path: path ?? null });
}

export async function saveResume(resume: Resume, path?: string): Promise<void> {
  await invoke("save_resume", { resume, path: path ?? null });
}

export async function defaultResumePath(): Promise<string> {
  return invoke<string>("default_resume_path");
}
