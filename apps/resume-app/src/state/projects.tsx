import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Project } from '../types';
import {
  createProjectApi,
  deleteProjectApi,
  duplicateProjectApi,
  listProjects,
  patchProjectApi,
} from '../lib/api';

export type ProjectsContextValue = {
  projects: Project[];
  loading: boolean;
  error?: string;
  refreshProjects: () => Promise<void>;
  createProject: (name: string, designSystemId: string | null, locale?: string) => Promise<Project | null>;
  deleteProject: (id: string) => Promise<boolean>;
  updateProject: (id: string, patch: Partial<Pick<Project, 'name' | 'locale' | 'designSystemId'>>) => Promise<Project | null>;
  duplicateProject: (id: string) => Promise<Project | null>;
};

export const ProjectsContext = createContext<ProjectsContextValue | null>(null);

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  const refreshProjects = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setProjects(await listProjects());
    } catch (err) {
      setError((err as Error).message);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshProjects();
  }, [refreshProjects]);

  const createProject = useCallback(
    async (name: string, designSystemId: string | null, locale = 'zh-CN'): Promise<Project | null> => {
      try {
        const project = await createProjectApi({
          name,
          locale,
          designSystemId: designSystemId ?? undefined,
        });
        setProjects((prev) => [project, ...prev]);
        return project;
      } catch (err) {
        setError((err as Error).message);
        return null;
      }
    },
    []
  );

  const deleteProject = useCallback(async (id: string): Promise<boolean> => {
    try {
      await deleteProjectApi(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    }
  }, []);

  const updateProject = useCallback(
    async (id: string, patch: Partial<Pick<Project, 'name' | 'locale' | 'designSystemId'>>): Promise<Project | null> => {
      try {
        const project = await patchProjectApi(id, patch);
        setProjects((prev) => prev.map((p) => (p.id === id ? project : p)));
        return project;
      } catch (err) {
        setError((err as Error).message);
        return null;
      }
    },
    []
  );

  const duplicateProject = useCallback(async (id: string): Promise<Project | null> => {
    try {
      const project = await duplicateProjectApi(id);
      setProjects((prev) => [project, ...prev]);
      return project;
    } catch (err) {
      setError((err as Error).message);
      return null;
    }
  }, []);

  return (
    <ProjectsContext.Provider
      value={{
        projects,
        loading,
        error,
        refreshProjects,
        createProject,
        deleteProject,
        updateProject,
        duplicateProject,
      }}
    >
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjects() {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error('useProjects must be used within <ProjectsProvider>');
  return ctx;
}
