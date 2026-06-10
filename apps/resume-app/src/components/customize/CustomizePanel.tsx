import { useState } from "react";

import { useT } from "@/lib/i18n";

import { CustomizeSubNav, type SubNavKey } from "./CustomizeSubNav";
import { DocumentPanel } from "./DocumentPanel";
import { PlaceholderPanel } from "./PlaceholderPanel";

/// Map of sub-nav keys to their i18n label keys. Used to get the title
/// for the PlaceholderPanel when a sub-panel isn't implemented yet.
const SUB_NAV_TITLE_KEYS: Record<SubNavKey, string> = {
  document: "customize.subNav.document",
  templates: "customize.subNav.templates",
  layout: "customize.subNav.layout",
  fontSize: "customize.subNav.fontSize",
  spacing: "customize.subNav.spacing",
  entries: "customize.subNav.entries",
  headings: "customize.subNav.headings",
  font: "customize.subNav.font",
  colors: "customize.subNav.colors",
  header: "customize.subNav.header",
  photo: "customize.subNav.photo",
  links: "customize.subNav.links",
  footer: "customize.subNav.footer",
  sections: "customize.subNav.sections",
};

/// Top-level Customize panel. Renders the vertical sub-navigation sidebar on
/// the left and the active sub-panel on the right. Only the Document sub-panel
/// is fully implemented; all others show a styled placeholder.
export function CustomizePanel() {
  const t = useT();
  const [subNav, setSubNav] = useState<SubNavKey>("document");

  const renderSubPanel = () => {
    switch (subNav) {
      case "document":
        return <DocumentPanel />;
      default:
        return (
          <PlaceholderPanel
            title={t(SUB_NAV_TITLE_KEYS[subNav] as Parameters<typeof t>[0])}
          />
        );
    }
  };

  return (
    <div className="flex gap-2 overflow-hidden">
      <CustomizeSubNav current={subNav} onChange={setSubNav} />
      <div className="flex-1 overflow-auto pr-1">{renderSubPanel()}</div>
    </div>
  );
}
