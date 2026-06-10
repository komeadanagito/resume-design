import { Undo2, Redo2, Sparkles } from "lucide-react";

import { Field } from "@/components/form/Field";
import { Select } from "@/components/form/Select";
import { useT } from "@/lib/i18n";
import { useResume } from "@/lib/resume-context";

/// Language options available in the Language dropdown.
const LANGUAGES = [
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "zh-CN", label: "中文 (简体)" },
  { value: "zh-TW", label: "中文 (繁體)" },
  { value: "ja-JP", label: "日本語" },
  { value: "ko-KR", label: "한국어" },
  { value: "fr-FR", label: "Français" },
  { value: "de-DE", label: "Deutsch" },
  { value: "es-ES", label: "Español" },
];

/// Date format options.
const DATE_FORMATS = [
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
  { value: "DD.MM.YYYY", label: "DD.MM.YYYY" },
  { value: "YYYY/MM/DD", label: "YYYY/MM/DD" },
];

/// Page format options.
const PAGE_FORMATS = [
  { value: "us-letter", label: "US Letter" },
  { value: "a4", label: "A4" },
  { value: "legal", label: "Legal" },
];

/// Document sub-panel: Document Settings card, Design Templates card, and
/// Layout card (with undo/redo). This is the default panel shown when the
/// Customize tab is active.
export function DocumentPanel() {
  const t = useT();
  const { settings, setSettings } = useResume();

  return (
    <div className="flex flex-col gap-5">
      {/* ── Document Settings ─────────────────────────────────── */}
      <div className="rounded-card bg-surface-card p-6 shadow-card">
        <h2 className="mb-5 text-lg font-extrabold text-ink-900">
          {t("customize.documentSettings")}
        </h2>
        <div className="flex flex-col gap-4">
          <Field label={t("customize.language")} htmlFor="doc-language">
            <Select
              id="doc-language"
              value={settings.language}
              onChange={(e) => setSettings({ language: e.target.value })}
            >
              {LANGUAGES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t("customize.dateFormat")} htmlFor="doc-date-format">
            <Select
              id="doc-date-format"
              value={settings.dateFormat}
              onChange={(e) => setSettings({ dateFormat: e.target.value })}
            >
              {DATE_FORMATS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t("customize.pageFormat")} htmlFor="doc-page-format">
            <Select
              id="doc-page-format"
              value={settings.pageFormat}
              onChange={(e) => setSettings({ pageFormat: e.target.value })}
            >
              {PAGE_FORMATS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>

      {/* ── Design Templates ──────────────────────────────────── */}
      <div className="rounded-card bg-surface-card p-6 shadow-card">
        <h2 className="mb-1 text-lg font-extrabold text-ink-900">
          {t("customize.designTemplates")}
        </h2>
        <p className="mb-4 text-sm text-ink-500">
          {t("customize.designTemplatesDesc")}
          <Sparkles size={14} className="ml-1 inline text-brand-500" />
        </p>

        {/* Template thumbnails — placeholder grid */}
        <div className="relative mb-4 flex items-center justify-center gap-3 rounded-xl bg-surface-muted px-4 py-5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-[80px] w-[56px] rounded-lg bg-surface-card shadow-card transition hover:shadow-cardHover"
            >
              {/* Skeleton lines to suggest a resume layout */}
              <div className="flex flex-col gap-1 p-2">
                <div className="h-1.5 w-full rounded-full bg-surface-tag" />
                <div className="h-1 w-3/4 rounded-full bg-surface-tag" />
                <div className="mt-1 h-1 w-full rounded-full bg-surface-muted" />
                <div className="h-1 w-full rounded-full bg-surface-muted" />
                <div className="h-1 w-2/3 rounded-full bg-surface-muted" />
                <div className="mt-1 h-1 w-full rounded-full bg-surface-muted" />
                <div className="h-1 w-5/6 rounded-full bg-surface-muted" />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            className="rounded-xl border border-surface-tag bg-surface-card px-5 py-2.5 text-sm font-semibold text-ink-900 transition hover:bg-surface-muted"
          >
            {t("customize.browseTemplates")}
          </button>
        </div>
      </div>

      {/* ── Layout ────────────────────────────────────────────── */}
      <div className="rounded-card bg-surface-card p-6 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-ink-900">
            {t("customize.layout")}
          </h2>
          <div className="flex gap-1">
            <button
              type="button"
              aria-label="Undo"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-surface-muted text-ink-500 transition hover:bg-surface-tag hover:text-ink-700"
            >
              <Undo2 size={16} />
            </button>
            <button
              type="button"
              aria-label="Redo"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-surface-muted text-ink-500 transition hover:bg-surface-tag hover:text-ink-700"
            >
              <Redo2 size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
