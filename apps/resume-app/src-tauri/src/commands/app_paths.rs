use std::path::PathBuf;

use tauri::AppHandle;

use crate::error::AppError;
use crate::paths;

/// Returns the default `resume.json` path for this platform.
#[tauri::command]
pub fn default_resume_path(app: AppHandle) -> Result<PathBuf, AppError> {
    paths::default_resume_file(&app)
}
