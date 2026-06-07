import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";

import type { PersonalInfo } from "./types/PersonalInfo";
import type { Resume } from "./types/Resume";
import type { Section } from "./types/Section";
import { loadResume, saveResume } from "./tauri";

/// Reducer actions. Every kind of edit goes through this enum so the surface
/// area is searchable and future features have one obvious extension point.
export type ResumeAction =
  | { kind: "load"; resume: Resume }
  | { kind: "setPersonal"; personal: PersonalInfo }
  | { kind: "addSection"; section: Section }
  | { kind: "removeSection"; index: number }
  | { kind: "reorderSections"; from: number; to: number }
  | { kind: "updateSection"; index: number; section: Section };

export function resumeReducer(state: Resume, action: ResumeAction): Resume {
  switch (action.kind) {
    case "load":
      return action.resume;

    case "setPersonal":
      return { ...state, personal: action.personal };

    case "addSection":
      return { ...state, sections: [...state.sections, action.section] };

    case "removeSection":
      return {
        ...state,
        sections: state.sections.filter((_, i) => i !== action.index),
      };

    case "reorderSections": {
      const next = state.sections.slice();
      const [moved] = next.splice(action.from, 1);
      if (moved) next.splice(action.to, 0, moved);
      return { ...state, sections: next };
    }

    case "updateSection": {
      const next = state.sections.slice();
      next[action.index] = action.section;
      return { ...state, sections: next };
    }
  }
}

type Status = "idle" | "loading" | "ready" | "saving" | "error";

type ResumeContextValue = {
  resume: Resume | null;
  status: Status;
  error: string | null;
  dispatch: (action: ResumeAction) => void;
  save: () => Promise<void>;
};

const ResumeContext = createContext<ResumeContextValue | null>(null);

const PLACEHOLDER_RESUME: Resume = {
  meta: { schemaVersion: "0.1.0", name: "Resume 1", locale: "zh-CN" },
  personal: {
    fullName: "",
    title: null,
    email: null,
    phone: null,
    location: null,
    photo: null,
    extras: [],
  },
  sections: [],
};

export function ResumeProvider({ children }: { children: ReactNode }) {
  const [resume, dispatch] = useReducer(resumeReducer, PLACEHOLDER_RESUME);
  const [status, setStatus] = useReducerState<Status>("loading");
  const [error, setError] = useReducerState<string | null>(null);

  useEffect(() => {
    loadResume()
      .then((loaded) => {
        dispatch({ kind: "load", resume: loaded });
        setStatus("ready");
      })
      .catch((err: unknown) => {
        setError(extractMessage(err));
        setStatus("error");
      });
  }, [setError, setStatus]);

  const save = async () => {
    setStatus("saving");
    try {
      await saveResume(resume);
      setStatus("ready");
    } catch (err) {
      setError(extractMessage(err));
      setStatus("error");
      throw err;
    }
  };

  const value = useMemo<ResumeContextValue>(
    () => ({ resume: status === "loading" ? null : resume, status, error, dispatch, save }),
    [resume, status, error],
  );

  return <ResumeContext.Provider value={value}>{children}</ResumeContext.Provider>;
}

export function useResume(): ResumeContextValue {
  const ctx = useContext(ResumeContext);
  if (!ctx) throw new Error("useResume must be used within <ResumeProvider>");
  return ctx;
}

// --- helpers -------------------------------------------------------------

function extractMessage(err: unknown): string {
  if (typeof err === "object" && err && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return String(err);
}

// Tiny ad-hoc useState that's stable across renders (for setters used in deps).
function useReducerState<T>(initial: T): [T, (next: T) => void] {
  const [state, setState] = useReducer((_: T, next: T) => next, initial);
  return [state, setState];
}
