import { Check } from "lucide-react";

import { useT } from "@/lib/i18n";
import type { SectionDef } from "@/lib/section-registry";

export type ContentKindCardProps = {
  def: SectionDef;
  /** When `true`, the resume already contains this kind; the card is shown
   *  in a muted style and clicks are no-ops. */
  added: boolean;
  onPick: () => void;
};

/// One tile in the Add Content modal's kind grid.
///
/// Layout follows the prototype (`addContentModal`): icon top-left, title
/// row, longer description below. Single-locale per current i18n setting.
export function ContentKindCard({ def, added, onPick }: ContentKindCardProps) {
  const t = useT();
  const Icon = def.icon;

  return (
    <button
      type="button"
      disabled={added}
      onClick={onPick}
      className={[
        "group relative flex flex-col gap-3 rounded-xl bg-surface p-4 text-left transition",
        added
          ? "opacity-50"
          : "hover:bg-brand-50 hover:shadow-card",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <span className="text-ink-900">
          <Icon size={20} />
        </span>
        <span className="text-sm font-bold text-ink-900">
          {t(def.titleKey)}
        </span>
      </div>

      <p className="text-xs leading-relaxed text-ink-700">
        {t(def.descriptionKey)}
      </p>

      {added && (
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-pill bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-500">
          <Check size={12} />
          {t("addContent.added")}
        </span>
      )}
    </button>
  );
}
