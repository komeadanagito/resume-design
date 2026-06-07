import { UploadCloud } from "lucide-react";
import { useMemo } from "react";

import { useT } from "@/lib/i18n";
import { useResume } from "@/lib/resume-context";
import { SECTION_REGISTRY } from "@/lib/section-registry";
import type { SectionKind } from "@/lib/types/SectionKind";

import { ContentKindCard } from "./ContentKindCard";
import { Modal } from "./Modal";

export type AddContentModalProps = {
  open: boolean;
  onClose: () => void;
};

/// FlowCV-style "Add content" picker. Renders a grid of `ContentKindCard`s
/// driven by `SECTION_REGISTRY`. Picking a kind dispatches `addSection` with
/// the blank instance from the registry, then closes the modal — the editor
/// re-renders its section list immediately because we share `useResume`.
///
/// Kinds already present in the resume are shown in a disabled "Added"
/// state; this matches the data-model invariant that each kind appears at
/// most once (the section's own card manages its items internally).
export function AddContentModal({ open, onClose }: AddContentModalProps) {
  const t = useT();
  const { resume, dispatch, save } = useResume();

  const presentKinds = useMemo(() => {
    const set = new Set<SectionKind>();
    resume?.sections.forEach((s) => set.add(s.type));
    return set;
  }, [resume]);

  const pick = async (kind: SectionKind) => {
    const def = SECTION_REGISTRY[kind];
    dispatch({ kind: "addSection", section: def.blank() });
    onClose();
    // Fire-and-forget save: failure shows up through the global error path.
    void save();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      widthClass="max-w-[960px]"
      title={t("addContent.title")}
      headerExtras={
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-pill bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-500 hover:bg-brand-50/70"
        >
          <span className="text-ink-500">{t("addContent.quickStart")}</span>
          <UploadCloud size={14} />
          {t("addContent.importResume")}
        </button>
      }
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {Object.values(SECTION_REGISTRY).map((def) => (
          <ContentKindCard
            key={def.kind}
            def={def}
            added={presentKinds.has(def.kind)}
            onPick={() => pick(def.kind)}
          />
        ))}
      </div>
    </Modal>
  );
}
