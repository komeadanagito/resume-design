import { ChevronDown, Download, MoreVertical } from "lucide-react";

import { useT, type StringKey } from "@/lib/i18n";

type NavKey = "overview" | "content" | "customize" | "aiTools";

const NAV: { key: NavKey; labelKey: StringKey }[] = [
  { key: "overview", labelKey: "nav.overview" },
  { key: "content", labelKey: "nav.content" },
  { key: "customize", labelKey: "nav.customize" },
  { key: "aiTools", labelKey: "nav.aiTools" },
];

export type TopNavProps = {
  current: NavKey;
  resumeName: string;
};

/// Floating white card across the top: blue logo block, brand text, nav pills,
/// resume dropdown, dark Download button, ⋯ button.
export function TopNav({ current, resumeName }: TopNavProps) {
  const t = useT();

  return (
    <header className="flex items-center justify-between rounded-card bg-surface-card px-6 py-3 shadow-card">
      <div className="flex items-center">
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
                {t(item.labelKey)}
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
          {resumeName}
          <ChevronDown size={14} />
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-xl bg-ink-900 px-4 py-2.5 text-sm font-bold text-white"
        >
          <Download size={14} />
          {t("nav.download")}
        </button>
        <button
          type="button"
          aria-label={t("nav.more")}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-surface-card text-ink-900 shadow-card"
        >
          <MoreVertical size={16} />
        </button>
      </div>
    </header>
  );
}
