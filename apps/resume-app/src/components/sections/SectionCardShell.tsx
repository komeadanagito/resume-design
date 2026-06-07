import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";

import { useT, type StringKey } from "@/lib/i18n";

export type SectionCardMode = "collapsed" | "expanded" | "editing";

export type SectionCardShellProps = {
  titleKey: StringKey;
  icon: ReactNode;

  /** Optional preview list rendered in the expanded state. Each item is a
   *  React node; the shell wraps it in a clickable row with an `onClick` that
   *  opens the editing slot for that entry. */
  entries?: EntryRow[];

  /** Renders the editing form when mode === "editing". The shell passes
   *  `entry` (the entry being edited, or `undefined` when adding a new one)
   *  plus `onDone` (call after save or cancel to return to expanded). */
  renderEditor: (entry: unknown | undefined, onDone: () => void) => ReactNode;

  /** Removes this whole section from the resume. When provided, the shell
   *  renders a delete button in the expanded body. Caller dispatches
   *  `removeSection` with the section's index. */
  onDelete?: () => void;

  /** Optional per-entry delete. When provided, each entry row gets a trash
   *  icon button. Use for sections with N entries (Experience, Education);
   *  leave undefined for `singleEntry` sections — `onDelete` covers the
   *  one-entry case. */
  onDeleteEntry?: (id: string) => void;

  /** When the user clicks "+ new entry" we open the editor with `entry =
   *  undefined`. Sections that only ever hold one item (e.g. Summary) can set
   *  `singleEntry` so the "+ new entry" button is hidden once `entries.length
   *  >= 1`. */
  singleEntry?: boolean;

  /** Initial mode — usually "collapsed", but a freshly added card may want
   *  "editing" so the user lands directly in the form. */
  initialMode?: SectionCardMode;
};

export type EntryRow = {
  /** Stable identifier used when calling back to edit a specific row. */
  id: string;
  /** What to show in the row before the user clicks to edit. */
  preview: ReactNode;
};

/// Generic 3-state shell shared by every section kind.
///
/// State machine:
///   collapsed --(header click)→ expanded
///   expanded  --(header click)→ collapsed
///   expanded  --(+ new entry)→ editing(undefined)
///   expanded  --(click entry row)→ editing(entry)
///   editing   --(onDone callback)→ expanded
///
/// `renderEditor` and `entries` are the per-kind extension points. Adding a
/// new section kind = new component file that calls `<SectionCardShell ...>`
/// and provides those two props.
export function SectionCardShell({
  titleKey,
  icon,
  entries = [],
  renderEditor,
  onDelete,
  onDeleteEntry,
  singleEntry = false,
  initialMode = "collapsed",
}: SectionCardShellProps) {
  const t = useT();
  const [mode, setMode] = useState<SectionCardMode>(initialMode);
  const [editingId, setEditingId] = useState<string | null>(null);

  const editingEntry = entries.find((e) => e.id === editingId);
  const showAddButton = !singleEntry || entries.length === 0;

  return (
    <article className="overflow-hidden rounded-card bg-surface-card shadow-card">
      <button
        type="button"
        onClick={() =>
          setMode((m) => (m === "collapsed" ? "expanded" : "collapsed"))
        }
        aria-label={mode === "collapsed" ? t("sectionCard.expand") : t("sectionCard.collapse")}
        className="flex w-full items-center justify-between px-6 py-4 text-left transition hover:bg-surface"
      >
        <div className="flex items-center gap-3">
          <span className="text-ink-700">{icon}</span>
          <span className="text-base font-bold text-ink-900">{t(titleKey)}</span>
        </div>
        <span className="text-ink-500">
          {mode === "collapsed" ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </span>
      </button>

      {mode === "expanded" && (
        <div className="flex flex-col gap-2 px-4 pb-4">
          {entries.length === 0 ? (
            <p className="px-2 py-3 text-sm text-ink-500">{t("sectionCard.emptyHint")}</p>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-2 rounded-xl bg-surface px-4 py-3 transition hover:bg-surface-tag"
              >
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(entry.id);
                    setMode("editing");
                  }}
                  className="flex-1 text-left text-sm text-ink-900"
                >
                  {entry.preview}
                </button>
                {onDeleteEntry && (
                  <button
                    type="button"
                    aria-label={t("sectionCard.delete")}
                    onClick={() => onDeleteEntry(entry.id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-pill text-ink-500 hover:bg-surface-card hover:text-brand-500"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))
          )}
          <div className="mt-1 flex items-center justify-between">
            {showAddButton ? (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setMode("editing");
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-pill bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-500 hover:bg-brand-50/70"
              >
                <Plus size={14} />
                {t("sectionCard.newEntry")}
              </button>
            ) : (
              <span />
            )}
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-sm font-semibold text-ink-500 hover:bg-surface hover:text-brand-500"
              >
                <Trash2 size={14} />
                {t("sectionCard.delete")}
              </button>
            )}
          </div>
        </div>
      )}

      {mode === "editing" && (
        <div className="border-t border-surface px-6 py-5">
          {renderEditor(editingEntry, () => {
            setEditingId(null);
            setMode("expanded");
          })}
        </div>
      )}
    </article>
  );
}
