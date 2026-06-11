import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Project } from '../types';

export type ProjectsContextValue = {
  projects: Project[];
  loading: boolean;
  createProject: (name: string, skillId: string | null, designSystemId: string | null, fidelity?: 'wireframe' | 'high') => Promise<Project | null>;
  deleteProject: (id: string) => Promise<boolean>;
  updateProject: (id: string, patch: Partial<Project>) => Promise<Project | null>;
  duplicateProject: (id: string) => Promise<Project | null>;
  refreshProjects: () => Promise<void>;
};

export const ProjectsContext = createContext<ProjectsContextValue | null>(null);

// In-memory fallback database for local testing when daemon is offline
let mockProjects: Project[] = [
  {
    id: 'mock-1',
    name: '软件工程师简历 (技术岗)',
    createdAt: Date.now() - 3600000 * 24 * 3,
    updatedAt: Date.now() - 3600000 * 2,
    skillId: 'resume-modern-tech',
    designSystemId: 'linear-style',
    locale: 'zh',
    fidelity: 'high',
  },
  {
    id: 'mock-2',
    name: 'Research PM Resume (Bilingual)',
    createdAt: Date.now() - 3600000 * 24 * 10,
    updatedAt: Date.now() - 3600000 * 24 * 2,
    skillId: 'resume-bilingual-cn-en',
    designSystemId: 'anthropic-style',
    locale: 'en',
    fidelity: 'high',
  }
];

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshProjects = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/projects');
      if (resp.ok) {
        const data = await resp.json();
        setProjects(data.projects || []);
      } else {
        setProjects(mockProjects);
      }
    } catch {
      setProjects(mockProjects);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProjects();
  }, []);

  const createProject = async (
    name: string,
    skillId: string | null,
    designSystemId: string | null,
    fidelity: 'wireframe' | 'high' = 'high'
  ): Promise<Project | null> => {
    const newProj = {
      name,
      skillId,
      designSystemId,
      fidelity,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      const resp = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProj),
      });
      if (resp.ok) {
        const data = await resp.json();
        setProjects((prev) => [data.project, ...prev]);
        return data.project;
      }
    } catch (e) {
      // Fallback
    }

    const mockProj: Project = {
      id: `mock-${Math.random().toString(36).substring(2, 9)}`,
      ...newProj,
    };
    mockProjects = [mockProj, ...mockProjects];
    setProjects(mockProjects);
    return mockProj;
  };

  const deleteProject = async (id: string): Promise<boolean> => {
    try {
      const resp = await fetch(`/api/projects/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (resp.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== id));
        return true;
      }
    } catch (e) {
      // Fallback
    }

    mockProjects = mockProjects.filter((p) => p.id !== id);
    setProjects(mockProjects);
    return true;
  };

  const updateProject = async (id: string, patch: Partial<Project>): Promise<Project | null> => {
    try {
      const resp = await fetch(`/api/projects/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (resp.ok) {
        const data = await resp.json();
        setProjects((prev) => prev.map((p) => (p.id === id ? data.project : p)));
        return data.project;
      }
    } catch (e) {
      // Fallback
    }

    let updatedProj: Project | null = null;
    mockProjects = mockProjects.map((p) => {
      if (p.id === id) {
        updatedProj = { ...p, ...patch, updatedAt: Date.now() };
        return updatedProj;
      }
      return p;
    });
    setProjects(mockProjects);
    return updatedProj;
  };

  const duplicateProject = async (id: string): Promise<Project | null> => {
    try {
      const resp = await fetch(`/api/projects/${encodeURIComponent(id)}/duplicate`, {
        method: 'POST',
      });
      if (resp.ok) {
        const data = await resp.json();
        setProjects((prev) => [data.project, ...prev]);
        return data.project;
      }
    } catch (e) {
      // Fallback
    }

    const target = mockProjects.find((p) => p.id === id);
    if (!target) return null;

    const dupProj: Project = {
      ...target,
      id: `mock-${Math.random().toString(36).substring(2, 9)}`,
      name: `${target.name} (复制)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    mockProjects = [dupProj, ...mockProjects];
    setProjects(mockProjects);
    return dupProj;
  };

  return (
    <ProjectsContext.Provider
      value={{
        projects,
        loading,
        createProject,
        deleteProject,
        updateProject,
        duplicateProject,
        refreshProjects,
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
