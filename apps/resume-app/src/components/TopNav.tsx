import {
  ChevronDown,
  Download,
  FileText,
  LayoutGrid,
  MoreVertical,
  Sparkles,
} from "lucide-react";

type NavItem = {
  key: "overview" | "content" | "customize" | "aiTools";
  label: string;
  icon: typeof LayoutGrid;
};

const NAV: NavItem[] = [
  { key: "overview", label: "Overview 概述", icon: LayoutGrid },
  { key: "content", label: "Content 内容", icon: FileText },
  { key: "customize", label: "Customize 定制", icon: Sparkles },
  { key: "aiTools", label: "AI Tools 人工智能工具", icon: Sparkles },
];

export type TopNavProps = {
  current: NavItem["key"];
};

/// Top navigation bar from the prototype: blue logo block, brand text, nav
/// pills, resume dropdown, dark Download button, more (⋯) button.
export function TopNav({ current }: TopNavProps) {
  return (
    <header className="flex items-center justify-between rounded-card bg-surface-card px-6 py-3 shadow-card">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500">
            <div className="h-4 w-4 rounded-sm bg-white" />
          </div>
          <span className="text-xl font-extrabold text-ink-900">
            resume design
          </span>
        </div>

        <nav className="flex items-center gap-1">
          {NAV.map((item) => {
            const active = item.key === current;
            return (
              <button
                key={item.key}
                type="button"
                className={[
                  "inline-flex items-center gap-2 rounded-pill px-4 py-2.5 text-sm font-semibold transition",
                  active
                    ? "bg-brand-50 text-brand-500"
                    : "text-ink-500 hover:bg-surface-muted hover:text-ink-700",
                ].join(" ")}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-xl bg-surface-muted px-4 py-2.5 text-sm font-semibold text-ink-900"
        >
          Resume 1 简历 1
          <ChevronDown size={14} />
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-xl bg-ink-900 px-4 py-2.5 text-sm font-bold text-white"
        >
          <Download size={14} />
          Download 下载
        </button>
        <button
          type="button"
          aria-label="More"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-surface-card text-ink-900 shadow-card"
        >
          <MoreVertical size={16} />
        </button>
      </div>
    </header>
  );
}
