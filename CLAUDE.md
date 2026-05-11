技术栈:

桌面端：

Tauri 2

前端：

React + TypeScript + Vite

UI：

Tailwind CSS + shadcn/ui

状态管理：

Zustand

代码编辑器：

Monaco Editor

简历 PDF：

HTML/CSS 预览 + react-pdf 导出

网页预览：

iframe sandbox

本地数据库：

SQLite

本地文件：

Tauri fs plugin

API Key 安全保存：

Tauri Stronghold / 系统密钥链方案

AI 接口：

OpenAI-compatible API

包管理：

pnpm



目录结构:

resume-design/

├─ src/

│  ├─ app/

│  │  ├─ routes/

│  │  │  ├─ Home.tsx

│  │  │  ├─ ResumeEditor.tsx

│  │  │  ├─ WebsiteBuilder.tsx

│  │  │  └─ Settings.tsx

│  │  └─ App.tsx

│  │

│  ├─ components/

│  │  ├─ layout/

│  │  ├─ ui/

│  │  ├─ resume/

│  │  ├─ website/

│  │  └─ assistant/

│  │

│  ├─ store/

│  │  ├─ resumeStore.ts

│  │  ├─ websiteStore.ts

│  │  └─ settingsStore.ts

│  │

│  ├─ ai/

│  │  ├─ openaiCompatible.ts

│  │  ├─ prompts.ts

│  │  └─ actions.ts

│  │

│  ├─ templates/

│  │  ├─ resume/

│  │  └─ website/

│  │

│  ├─ pdf/

│  │  ├─ ResumePdf.tsx

│  │  └─ exportPdf.ts

│  │

│  └─ styles/

│     └─ globals.css

│

├─ src-tauri/

│  ├─ src/

│  │  └─ main.rs

│  ├─ capabilities/

│  └─ tauri.conf.json

│

├─ public/

│  ├─ logo.png

│  └─ templates/

│

├─ package.json

├─ vite.config.ts

└─ tsconfig.json

