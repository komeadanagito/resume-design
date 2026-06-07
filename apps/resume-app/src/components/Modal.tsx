import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { useT } from "@/lib/i18n";

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  /** Tailwind width class, e.g. "max-w-[640px]". */
  widthClass?: string;
  children: ReactNode;
  /** Optional content placed before/after the close button in the header. */
  headerExtras?: ReactNode;
};

/// Generic centered modal: dim backdrop + floating white panel. Closes on
/// Escape and on backdrop click. Renders through a portal so it sits above
/// any stacking context.
export function Modal({
  open,
  onClose,
  title,
  widthClass = "max-w-[560px]",
  children,
  headerExtras,
}: ModalProps) {
  const t = useT();

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/30 p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={[
          "flex max-h-[80vh] w-full flex-col overflow-hidden rounded-card bg-surface-card shadow-cardHover",
          widthClass,
        ].join(" ")}
      >
        {(title || headerExtras) && (
          <header className="flex items-center justify-between gap-4 px-6 py-5">
            <div className="flex-1 text-xl font-extrabold text-ink-900">
              {title}
            </div>
            <div className="flex items-center gap-2">
              {headerExtras}
              <button
                type="button"
                aria-label={t("addContent.closeAriaLabel")}
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-ink-700 hover:bg-surface-tag"
              >
                <X size={16} />
              </button>
            </div>
          </header>
        )}
        <div className="flex-1 overflow-auto px-6 pb-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
