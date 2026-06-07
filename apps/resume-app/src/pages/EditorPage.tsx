import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { PersonalCard } from "@/components/PersonalCard";
import { TopNav } from "@/components/TopNav";
import { useResume } from "@/lib/resume-context";

/// App shell. Phase 1 renders:
///   - Top nav (visual only)
///   - Personal info card (clicking the pencil → PersonalDetailsPage)
///   - "Add Content" button (no modal yet)
///   - Right side: placeholder preview area
export function EditorPage() {
  const { resume, status, error } = useResume();
  const navigate = useNavigate();

  if (status === "loading") {
    return <CenteredMessage>Loading…</CenteredMessage>;
  }
  if (status === "error") {
    return <CenteredMessage tone="error">Error: {error ?? "unknown"}</CenteredMessage>;
  }
  if (!resume) {
    return <CenteredMessage tone="error">No resume loaded.</CenteredMessage>;
  }

  return (
    <div className="flex h-full flex-col gap-6 bg-surface p-6">
      <TopNav current="content" />

      <main className="grid flex-1 grid-cols-[minmax(360px,_560px)_1fr] gap-6 overflow-hidden">
        <section className="flex flex-col gap-6 overflow-auto pr-1">
          <PersonalCard
            personal={resume.personal}
            onEdit={() => navigate("/personal")}
          />

          <button
            type="button"
            aria-label="Add content"
            className="mx-auto flex w-[260px] items-center justify-center gap-2 rounded-button bg-brand-500 px-6 py-4 text-base font-bold text-white shadow-card transition hover:bg-brand-600 hover:shadow-cardHover"
          >
            <Plus size={18} />
            Add Content 添加内容
          </button>
        </section>

        <section className="flex flex-col items-center justify-center rounded-card bg-surface-card text-ink-300 shadow-card">
          <p className="text-sm">Preview 预览（后续阶段）</p>
        </section>
      </main>
    </div>
  );
}

function CenteredMessage({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "error";
}) {
  return (
    <div className="flex h-full items-center justify-center">
      <p className={tone === "error" ? "text-brand-600" : "text-ink-500"}>{children}</p>
    </div>
  );
}
