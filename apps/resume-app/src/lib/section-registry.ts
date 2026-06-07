// Section registry — the extension point for adding new section kinds.
//
// To add a new kind (e.g. Languages):
//   1. Rust:      add a variant to `Section` + a new struct.
//   2. ts-rs:     re-run `cargo test -p resume-core --features ts`.
//   3. Frontend:  add an entry below + (optionally) write its form / preview components.
//
// No other file needs to change. The Add Content modal and EditorPage iterate
// over SECTION_REGISTRY directly.

import {
  AlignLeft,
  Briefcase,
  GraduationCap,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { ComponentType } from "react";

import type { Section } from "./types/Section";
import type { SectionKind } from "./types/SectionKind";

export type SectionFormProps<T> = {
  value: T;
  onChange: (next: T) => void;
};

export type SectionPreviewProps<T> = {
  value: T;
};

export type SectionDef = {
  kind: SectionKind;
  /** Bilingual display title, e.g. "Experience 经验". */
  title: string;
  icon: LucideIcon;
  /** Optional — undefined means the kind has no editor yet (Phase 1 default). */
  formComponent?: ComponentType<SectionFormProps<unknown>>;
  /** Optional — undefined means EditorPage will render a default placeholder. */
  previewComponent?: ComponentType<SectionPreviewProps<unknown>>;
  /** Returns a blank instance for the Add Content modal. */
  blank: () => Section;
};

export const SECTION_REGISTRY: Record<SectionKind, SectionDef> = {
  summary: {
    kind: "summary",
    title: "Summary 概述",
    icon: AlignLeft,
    blank: () => ({ type: "summary", content: "" }),
  },
  experience: {
    kind: "experience",
    title: "Experience 经验",
    icon: Briefcase,
    blank: () => ({ type: "experience", items: [] }),
  },
  education: {
    kind: "education",
    title: "Education 教育",
    icon: GraduationCap,
    blank: () => ({ type: "education", items: [] }),
  },
  skills: {
    kind: "skills",
    title: "Skills 技能",
    icon: Sparkles,
    blank: () => ({ type: "skills", groups: [] }),
  },
};

export const SECTION_ORDER: SectionKind[] = [
  "summary",
  "experience",
  "education",
  "skills",
];
