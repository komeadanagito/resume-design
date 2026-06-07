// i18n — minimal, type-safe, dependency-free.
//
// One `LocaleProvider` at the root holds the current locale + the active
// dictionary. Components call `const t = useT();` and then `t("nav.content")`.
//
// Adding a new locale: drop a `<name>.ts` next to `zh.ts` matching the same
// shape (TypeScript will check), then add it to `DICTS` and `LocaleCode`.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { en } from "./en";
import { zh } from "./zh";

export type LocaleCode = "zh" | "en";

const DICTS: Record<LocaleCode, typeof zh> = { zh, en };

type Dict = typeof zh;

/// Dotted key into the dictionary tree. Type derivation gives full
/// autocomplete + compile-time check on the call site.
export type StringKey = DotKeys<Dict>;

type DotKeys<T> = T extends Record<string, unknown>
  ? {
      [K in keyof T & string]: T[K] extends string
        ? K
        : T[K] extends Record<string, unknown>
          ? `${K}.${DotKeys<T[K]>}`
          : never;
    }[keyof T & string]
  : never;

type LocaleContextValue = {
  locale: LocaleCode;
  setLocale: (next: LocaleCode) => void;
  t: (key: StringKey) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  initial = "zh",
  children,
}: {
  initial?: LocaleCode;
  children: ReactNode;
}) {
  const [locale, setLocale] = useState<LocaleCode>(initial);
  const dict = DICTS[locale];

  const t = useCallback(
    (key: StringKey): string => {
      const parts = key.split(".");
      let cursor: unknown = dict;
      for (const part of parts) {
        if (typeof cursor !== "object" || cursor === null) return key;
        cursor = (cursor as Record<string, unknown>)[part];
      }
      return typeof cursor === "string" ? cursor : key;
    },
    [dict],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, t }),
    [locale, t],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within <LocaleProvider>");
  return ctx;
}

export function useT(): (key: StringKey) => string {
  return useLocale().t;
}
