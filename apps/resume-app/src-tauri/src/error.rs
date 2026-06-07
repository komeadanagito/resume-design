use serde::Serialize;
use thiserror::Error;

/// Errors surfaced to the frontend. Each variant carries a stable `code` (for
/// programmatic handling) and a human-readable message.
#[derive(Debug, Error)]
pub enum AppError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("core error: {0}")]
    Core(#[from] resume_core::CoreError),

    #[error("path resolution failed: {0}")]
    Path(String),
}

impl AppError {
    fn code(&self) -> &'static str {
        match self {
            AppError::Io(_) => "io",
            AppError::Core(resume_core::CoreError::Io(_)) => "io",
            AppError::Core(resume_core::CoreError::Json(_)) => "json",
            AppError::Core(resume_core::CoreError::UnsupportedSchema { .. }) => "schema",
            AppError::Path(_) => "path",
        }
    }
}

#[derive(Debug, Serialize)]
struct WireError<'a> {
    code: &'a str,
    message: String,
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        WireError {
            code: self.code(),
            message: self.to_string(),
        }
        .serialize(serializer)
    }
}
