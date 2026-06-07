import { HashRouter, Navigate, Route, Routes } from "react-router-dom";

import { ResumeProvider } from "./lib/resume-context";
import { EditorPage } from "./pages/EditorPage";
import { PersonalDetailsPage } from "./pages/PersonalDetailsPage";

/// Routes table — adding a new page is one entry here plus a file under `pages/`.
export function App() {
  return (
    <ResumeProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<EditorPage />} />
          <Route path="/personal" element={<PersonalDetailsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </ResumeProvider>
  );
}
