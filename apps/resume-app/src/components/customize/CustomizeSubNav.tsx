import type { StringKey } from "@/lib/i18n";
import { useT } from "@/lib/i18n";

/// Union of all sub-navigation keys in the Customize panel.
export type SubNavKey =
  | "document"
  | "templates"
  | "layout"
  | "fontSize"
  | "spacing"
  | "entries"
  | "headings"
  | "font"
  | "colors"
  | "header"
  | "photo"
  | "links"
  | "footer"
  | "sections";

const SUB_NAV_ITEMS: { key: SubNavKey; labelKey: StringKey }[] = [
  { key: "document", labelKey: "customize.subNav.document" },
  { key: "templates", labelKey: "customize.subNav.templates" },
  { key: "layout", labelKey: "customize.subNav.layout" },
  { key: "fontSize", labelKey: "customize.subNav.fontSize" },
  { key: "spacing", labelKey: "customize.subNav.spacing" },
  { key: "entries", labelKey: "customize.subNav.entries" },
  { key: "headings", labelKey: "customize.subNav.headings" },
  { key: "font", labelKey: "customize.subNav.font" },
  { key: "colors", labelKey: "customize.subNav.colors" },
  { key: "header", labelKey: "customize.subNav.header" },
  { key: "photo", labelKey: "customize.subNav.photo" },
  { key: "links", labelKey: "customize.subNav.links" },
  { key: "footer", labelKey: "customize.subNav.footer" },
  { key: "sections", labelKey: "customize.subNav.sections" },
];

export type CustomizeSubNavProps = {
  current: SubNavKey;
  onChange: (key: SubNavKey) => void;
};

/// Vertical sidebar navigation for the Customize panel. Shows 14 sub-panel
/// options with a brand-color left-bar indicator on the active item.
export function CustomizeSubNav({ current, onChange }: CustomizeSubNavProps) {
  const t = useT();

  return (
    <nav className="flex w-[120px] flex-shrink-0 flex-col gap-0.5 py-2">
      {SUB_NAV_ITEMS.map((item) => {
        const active = item.key === current;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            className={[
              "relative rounded-r-lg px-4 py-2 text-left text-sm font-semibold transition-colors",
              active
                ? "text-brand-500"
                : "text-ink-500 hover:bg-surface-muted hover:text-ink-700",
            ].join(" ")}
          >
            {/* Active indicator bar */}
            {active && (
              <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-500" />
            )}
            {t(item.labelKey)}
          </button>
        );
      })}
    </nav>
  );
}
