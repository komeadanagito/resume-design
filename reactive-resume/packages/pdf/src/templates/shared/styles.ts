import type { Style } from "@react-pdf/types";

export type TemplatePlacement = "main" | "sidebar";

export type StyleInput = Style | Style[] | null | undefined;

export const composeStyles = (...styles: StyleInput[]): Style[] => {
	return styles.flatMap((style) => {
		if (!style) return [];
		if (Array.isArray(style)) return style.filter(Boolean);

		return [style];
	});
};

const linkUnderlineStyle = { textDecoration: "underline" } satisfies Style;

export const composeLinkStyles = (...styles: StyleInput[]): Style[] => composeStyles(...styles, linkUnderlineStyle);

export const mergeStyles = (...styles: StyleInput[]): Style => Object.assign({}, ...composeStyles(...styles));

export const mergeLinkStyles = (...styles: StyleInput[]): Style => mergeStyles(...styles, linkUnderlineStyle);

export const headerNameLineHeight = 1.2;

export type ResolvePlacementColorOptions = {
	placement: TemplatePlacement;
	defaultForeground: string;
	sidebarForeground?: string | undefined;
};

export const resolvePlacementColor = ({
	placement,
	defaultForeground,
	sidebarForeground,
}: ResolvePlacementColorOptions) => {
	if (placement === "sidebar" && sidebarForeground) return sidebarForeground;

	return defaultForeground;
};
