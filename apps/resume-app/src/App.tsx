import { LocaleProvider } from "./lib/i18n";
import { ResumeProvider } from "./lib/resume-context";
import { EditorPage } from "./pages/EditorPage";

/// Single-page entry. Routing wasn't earning its keep: the personal edit panel
/// now expands the existing card in place rather than navigating away, and the
/// Add Content modal lives inside `EditorPage`. New routes can be added back
/// (e.g. `react-router`) when there's a real second top-level page.
export function App() {
  return (
    <LocaleProvider initial="zh">
      <ResumeProvider>
        <EditorPage />
      </ResumeProvider>
    </LocaleProvider>
  );
}
