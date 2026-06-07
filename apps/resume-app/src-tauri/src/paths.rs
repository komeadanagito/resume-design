use std::path::PathBuf;

use tauri::{AppHandle, Manager};

use crate::error::AppError;

/// Returns the platform-specific default location for `resume.json`.
///
/// macOS: `~/Library/Application Support/design.resume.app/resume.json`
/// Linux: `~/.local/share/design.resume.app/resume.json`
/// Windows: `%APPDATA%\design.resume.app\resume.json`
pub fn default_resume_file(app: &AppHandle) -> Result<PathBuf, AppError> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Path(e.to_string()))?;
    Ok(dir.join("resume.json"))
}
