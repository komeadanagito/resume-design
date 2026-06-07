import type { Section } from "@/lib/types/Section";

import { SummaryCard } from "./SummaryCard";

/// Closed switch over `Section.type`. Adding a new variant on the Rust side
/// regenerates `Section.ts`, which makes this switch non-exhaustive and the
/// compiler points exactly where the new card component needs to be wired in.
export function renderSectionCard(section: Section, index: number) {
  switch (section.type) {
    case "summary":
      return <SummaryCard key={index} index={index} section={section} />;
    case "experience":
    case "education":
    case "skills":
      // Cards for these kinds are added in a later slice. Render nothing for
      // now rather than fall through silently.
      return null;
  }
}
