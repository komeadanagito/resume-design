use thiserror::Error;

#[derive(Error, Debug)]
pub enum CoreError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("JSON parse error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("schema version {found:?} not supported (expected {expected:?})")]
    UnsupportedSchema { found: String, expected: String },
}
