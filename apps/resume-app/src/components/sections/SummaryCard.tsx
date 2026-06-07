import { AlignLeft } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/form/Button";
import { Field } from "@/components/form/Field";
import { useT } from "@/lib/i18n";
import { useResume } from "@/lib/resume-context";
import type { SummarySection } from "@/lib/types/SummarySection";

import { SectionCardShell, type EntryRow } from "./SectionCardShell";

export type SummaryCardProps = {
  index: number;
  section: SummarySection;
};

/// Section card for the `Summary` kind. Summary holds a single string of
/// content, so it behaves as a `singleEntry` shell: 0 or 1 row, no "+ new
/// entry" button once the row exists.
export function SummaryCard({ index, section }: SummaryCardProps) {
  const t = useT();
  const { dispatch, save } = useResume();

  const entries: EntryRow[] = section.content
    ? [
        {
          id: "summary",
          preview: <p className="line-clamp-3 whitespace-pre-line">{section.content}</p>,
        },
      ]
    : [];

  const persist = async (nextContent: string) => {
    dispatch({
      kind: "updateSection",
      index,
      section: { type: "summary", content: nextContent },
    });
    await save();
  };

  const remove = async () => {
    dispatch({ kind: "removeSection", index });
    await save();
  };

  return (
    <SectionCardShell
      titleKey="sections.summary"
      icon={<AlignLeft size={18} />}
      entries={entries}
      singleEntry
      onDelete={() => {
        void remove();
      }}
      renderEditor={(_entry, onDone) => (
        <SummaryEditor
          initial={section.content}
          placeholder={t("summary.contentPlaceholder")}
          onCancel={onDone}
          onSave={async (next) => {
            await persist(next);
            onDone();
          }}
        />
      )}
    />
  );
}

function SummaryEditor({
  initial,
  placeholder,
  onSave,
  onCancel,
}: {
  initial: string;
  placeholder: string;
  onSave: (next: string) => void | Promise<void>;
  onCancel: () => void;
}) {
  const t = useT();
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(value.trim());
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Field label={t("summary.contentLabel")} htmlFor="summary-content">
        <textarea
          id="summary-content"
          value={value}
          placeholder={placeholder}
          rows={5}
          onChange={(e) => setValue(e.target.value)}
          className="w-full resize-y rounded-xl bg-surface-muted px-4 py-3 text-base text-ink-900 placeholder:text-ink-300 outline-none transition focus:bg-surface-card focus:ring-2 focus:ring-brand-500"
        />
      </Field>
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
          {t("common.cancel")}
        </Button>
        <Button type="button" onClick={handleSave} disabled={saving}>
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}
