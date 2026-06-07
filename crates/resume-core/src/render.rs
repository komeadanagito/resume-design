use crate::Resume;

/// Convert a [`Resume`] into a renderer-specific output.
///
/// Each renderer picks its own `Output` (e.g. `String` for Markdown/HTML,
/// `Vec<u8>` for PDF) and `Error` (e.g. [`std::convert::Infallible`] for
/// pure-formatting renderers).
pub trait Renderer {
    type Output;
    type Error: std::error::Error + 'static;

    fn render(&self, resume: &Resume) -> Result<Self::Output, Self::Error>;
}
