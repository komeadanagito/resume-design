import { useState } from "react";

import { useResume } from "@/lib/resume-context";
import { PersonalCollapsed } from "./PersonalCollapsed";
import { PersonalEditPanel } from "./PersonalEditPanel";

/// Orchestrator for the personal info area in the left column of EditorPage.
/// Collapsed by default; clicking the pencil expands the same slot into the
/// full edit form. Done collapses back. No routing involved.
export function PersonalSection() {
  const { resume } = useResume();
  const [mode, setMode] = useState<"collapsed" | "expanded">("collapsed");

  if (!resume) return null;

  if (mode === "expanded") {
    return <PersonalEditPanel onDone={() => setMode("collapsed")} />;
  }
  return (
    <PersonalCollapsed
      personal={resume.personal}
      onEdit={() => setMode("expanded")}
    />
  );
}
