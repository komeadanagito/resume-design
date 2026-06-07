// Section registry — metadata for every kind (title key, icon, blank()
// constructor). UI components are NOT registered here; they're dispatched by
// the closed switch in `components/sections/render.tsx`, which is exhaustive
// against `SectionKind` so adding a kind without wiring up its card is a
// compile error.
//
// To add a new kind (e.g. Languages):
//   1. Rust:      add a variant to `Section` + a new struct.
//   2. ts-rs:     re-run `cargo test -p resume-core --features ts`.
//   3. Frontend:  add a registry entry below + a new card component + a new
//                 case in `render.tsx`. The compiler points to the case.

import {
  AlignLeft,
  Briefcase,
  GraduationCap,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import type { StringKey } from "./i18n";
import type { Section } from "./types/Section";
import type { SectionKind } from "./types/SectionKind";

export type SectionDef = {
  kind: SectionKind;
  /** Translation key for the short label, e.g. `"sections.experience"`. */
  titleKey: StringKey;
  /** Translation key for the long description shown inside the Add Content modal. */
  descriptionKey: StringKey;
  icon: LucideIcon;
  /** Returns a blank instance, used by the Add Content modal kind picker. */
  blank: () => Section;
};

export const SECTION_REGISTRY: Record<SectionKind, SectionDef> = {
  summary: {
    kind: "summary",
    titleKey: "sections.summary",
    descriptionKey: "addContent.descriptions.summary",
    icon: AlignLeft,
    blank: () => ({ type: "summary", content: "" }),
  },
  experience: {
    kind: "experience",
    titleKey: "sections.experience",
    descriptionKey: "addContent.descriptions.experience",
    icon: Briefcase,
    blank: () => ({ type: "experience", items: [] }),
  },
  education: {
    kind: "education",
    titleKey: "sections.education",
    descriptionKey: "addContent.descriptions.education",
    icon: GraduationCap,
    blank: () => ({ type: "education", items: [] }),
  },
  skills: {
    kind: "skills",
    titleKey: "sections.skills",
    descriptionKey: "addContent.descriptions.skills",
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
