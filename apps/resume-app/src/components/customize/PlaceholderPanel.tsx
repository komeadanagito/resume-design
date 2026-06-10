import { Construction } from "lucide-react";

import { useT } from "@/lib/i18n";

export type PlaceholderPanelProps = {
  title: string;
};

/// Generic "coming soon" placeholder for Customize sub-panels that are not
/// yet implemented. Shows the panel title and a styled hint so the navigation
/// feels complete and discoverable.
export function PlaceholderPanel({ title }: PlaceholderPanelProps) {
  const t = useT();

  return (
    <div className="rounded-card bg-surface-card p-8 shadow-card">
      <h2 className="mb-6 text-lg font-extrabold text-ink-900">{title}</h2>
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50">
          <Construction size={24} className="text-brand-500" />
        </div>
        <p className="text-sm font-semibold text-ink-700">
          {t("customize.comingSoon")}
        </p>
        <p className="max-w-[240px] text-xs text-ink-500">
          This panel will be available in a future update.
        </p>
      </div>
    </div>
  );
}
