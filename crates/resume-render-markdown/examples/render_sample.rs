//! End-to-end smoke: load `examples/sample.json` from the workspace root and
//! print the Markdown rendering to stdout.
//!
//! Run from the workspace root:
//!   cargo run -p resume-render-markdown --example render_sample

use std::path::PathBuf;

use resume_core::{io, Renderer};
use resume_render_markdown::MarkdownRenderer;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let sample = workspace_root()?.join("examples/sample.json");
    let resume = io::load_json(&sample)?;
    let out = MarkdownRenderer::new().render(&resume)?;
    print!("{out}");
    Ok(())
}

fn workspace_root() -> Result<PathBuf, Box<dyn std::error::Error>> {
    // CARGO_MANIFEST_DIR points at this crate; workspace root is two levels up.
    let manifest = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    Ok(manifest
        .parent()
        .and_then(|p| p.parent())
        .ok_or("could not find workspace root")?
        .to_path_buf())
}
