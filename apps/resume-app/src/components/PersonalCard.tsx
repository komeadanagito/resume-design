import { Camera, Mail, MapPin, Pencil, Phone } from "lucide-react";

import type { PersonalInfo } from "@/lib/types/PersonalInfo";

export type PersonalCardProps = {
  personal: PersonalInfo;
  onEdit: () => void;
};

/// Read-only summary card that lives on EditorPage. Clicking the pencil opens
/// the Personal Details page.
export function PersonalCard({ personal, onEdit }: PersonalCardProps) {
  const name = personal.fullName.trim() || "Your name 你的名字";
  const title = personal.title?.trim();

  return (
    <article className="relative flex items-start gap-4 rounded-card bg-surface-card p-5 shadow-card">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h2 className="text-lg font-semibold text-ink-900">{name}</h2>
        {title && <p className="text-sm text-ink-500">{title}</p>}

        <ul className="mt-1 flex flex-col gap-1.5 text-sm text-ink-700">
          <Row icon={<Mail size={14} />} value={personal.email} placeholder="Email 电子邮件" />
          <Row icon={<Phone size={14} />} value={personal.phone} placeholder="Phone 电话" />
          <Row icon={<MapPin size={14} />} value={personal.location} placeholder="Address 地址" />
        </ul>
      </div>

      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-surface-tag text-ink-300">
        <Camera size={24} />
      </div>

      <button
        type="button"
        aria-label="Edit personal details"
        onClick={onEdit}
        className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-white shadow-card transition hover:bg-brand-600"
      >
        <Pencil size={14} />
      </button>
    </article>
  );
}

function Row({
  icon,
  value,
  placeholder,
}: {
  icon: React.ReactNode;
  value: string | null;
  placeholder: string;
}) {
  const filled = !!value?.trim();
  return (
    <li className="flex items-center gap-2">
      <span className="text-ink-300">{icon}</span>
      <span className={filled ? "text-ink-700" : "text-ink-300"}>
        {filled ? value : placeholder}
      </span>
    </li>
  );
}
