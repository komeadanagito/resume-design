//! Tauri commands grouped by domain. Each submodule exposes `#[tauri::command]`
//! functions; `register_handlers!` collects them for the Tauri builder.
//!
//! Adding a new command: create the function in an existing or new submodule,
//! then add a line in `register_handlers!`.

pub mod app_paths;
pub mod resume_io;

/// Wires every command into a `tauri::Builder`. Keep this list flat — one line
/// per command — so additions are mechanical.
#[macro_export]
macro_rules! register_handlers {
    ($builder:expr) => {
        $builder.invoke_handler(tauri::generate_handler![
            $crate::commands::resume_io::load_resume,
            $crate::commands::resume_io::save_resume,
            $crate::commands::app_paths::default_resume_path,
        ])
    };
}
