import { Camera, Mail, MapPin, Pencil, Phone } from "lucide-react";
import type { ReactNode } from "react";

import { useT, type StringKey } from "@/lib/i18n";
import type { PersonalInfo } from "@/lib/types/PersonalInfo";

export type PersonalCollapsedProps = {
  personal: PersonalInfo;
  onEdit: () => void;
};

/// Read-only summary card. Clicking the pencil button switches the parent
/// PersonalSection into expanded mode.
export function PersonalCollapsed({ personal, onEdit }: PersonalCollapsedProps) {
  const t = useT();
  const name = personal.fullName.trim() || t("personal.placeholderName");

  return (
    <article className="relative flex items-start gap-4 rounded-card bg-surface-card p-6 shadow-card">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <h2 className="text-xl font-bold text-ink-500">{name}</h2>

        <ul className="flex flex-col gap-2 text-sm text-ink-500">
          <Row icon={<Mail size={14} />} value={personal.email} placeholderKey="personal.placeholderEmail" />
          <Row icon={<Phone size={14} />} value={personal.phone} placeholderKey="personal.placeholderPhone" />
          <Row icon={<MapPin size={14} />} value={personal.location} placeholderKey="personal.placeholderAddress" />
        </ul>
      </div>

      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-surface-tag text-white">
        <Camera size={24} />
      </div>

      <button
        type="button"
        aria-label={t("personal.editAriaLabel")}
        onClick={onEdit}
        className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-white shadow-card transition hover:bg-brand-600"
      >
        <Pencil size={14} />
      </button>
    </article>
  );
}

function Row({
  icon,
  value,
  placeholderKey,
}: {
  icon: ReactNode;
  value: string | null;
  placeholderKey: StringKey;
}) {
  const t = useT();
  const filled = !!value?.trim();
  return (
    <li className="flex items-center gap-2">
      <span className="text-ink-300">{icon}</span>
      <span className={filled ? "text-ink-900" : "text-ink-500"}>
        {filled ? value : t(placeholderKey)}
      </span>
    </li>
  );
}
