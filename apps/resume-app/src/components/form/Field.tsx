import type { ReactNode } from "react";

export type FieldProps = {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
};

/// Reusable label + control wrapper. Keeps spacing/typography consistent
/// across every form on every page.
export function Field({ label, htmlFor, hint, error, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-bold text-ink-900">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs text-ink-500">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-brand-600">{error}</p>
      )}
    </div>
  );
}
