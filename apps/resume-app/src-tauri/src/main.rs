#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod error;
mod paths;

fn main() {
    let builder = tauri::Builder::default();
    register_handlers!(builder)
        .run(tauri::generate_context!())
        .expect("error while running resume-tauri application");
}
