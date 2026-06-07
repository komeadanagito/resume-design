import { Plus } from "lucide-react";
import { useState, type ReactNode } from "react";

import { AddContentModal } from "@/components/AddContentModal";
import { PersonalSection } from "@/components/personal/PersonalSection";
import { renderSectionCard } from "@/components/sections/render";
import { TopNav } from "@/components/TopNav";
import { useT } from "@/lib/i18n";
import { useResume } from "@/lib/resume-context";

/// App shell — Phase 2 slice 1:
///   - Top nav (visual + locale awareness; routing not yet wired up)
///   - Left column: personal info (collapsed ↔ inline edit panel)
///   - Add Content button → centered modal (shell only for now)
///   - Right column: placeholder for the future preview
export function EditorPage() {
  const t = useT();
  const { resume, status, error } = useResume();
  const [addContentOpen, setAddContentOpen] = useState(false);

  if (status === "loading") {
    return <CenteredMessage>{t("editor.loading")}</CenteredMessage>;
  }
  if (status === "error") {
    return (
      <CenteredMessage tone="error">
        {t("editor.errorPrefix")}
        {error ?? ""}
      </CenteredMessage>
    );
  }
  if (!resume) {
    return <CenteredMessage tone="error">{t("editor.noResume")}</CenteredMessage>;
  }

  return (
    <div className="flex h-full flex-col gap-6 bg-surface p-6">
      <TopNav current="content" resumeName={resume.meta.name} />

      <main className="grid flex-1 grid-cols-[minmax(360px,_560px)_1fr] gap-6 overflow-hidden">
        <section className="flex flex-col gap-4 overflow-auto pr-1">
          <PersonalSection />

          {resume.sections.map((section, i) => renderSectionCard(section, i))}

          <button
            type="button"
            onClick={() => setAddContentOpen(true)}
            className="mx-auto mt-2 flex w-[260px] items-center justify-center gap-2 rounded-button bg-brand-500 px-6 py-4 text-base font-bold text-white shadow-card transition hover:bg-brand-600 hover:shadow-cardHover"
          >
            <Plus size={18} />
            {t("editor.addContent")}
          </button>
        </section>

        <section className="flex flex-col items-center justify-center rounded-card bg-surface-card text-ink-300 shadow-card">
          <p className="text-sm">{t("editor.previewPlaceholder")}</p>
        </section>
      </main>

      <AddContentModal
        open={addContentOpen}
        onClose={() => setAddContentOpen(false)}
      />
    </div>
  );
}

function CenteredMessage({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "error";
}) {
  return (
    <div className="flex h-full items-center justify-center bg-surface">
      <p className={tone === "error" ? "text-brand-600" : "text-ink-500"}>
        {children}
      </p>
    </div>
  );
}
