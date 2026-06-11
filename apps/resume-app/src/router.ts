import { useEffect, useState } from 'react';

export type Route =
  | { kind: 'home' }
  | { kind: 'project'; projectId: string; fileName: string | null }
  | { kind: 'skills' }
  | { kind: 'design-systems' };

export function parseRoute(pathname: string): Route {
  const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  if (parts.length === 0) return { kind: 'home' };
  
  if (parts[0] === 'library') {
    if (parts[1] === 'skills') return { kind: 'skills' };
    if (parts[1] === 'design-systems') return { kind: 'design-systems' };
  }

  if (parts[0] === 'projects' && parts[1]) {
    const projectId = decodeURIComponent(parts[1]);
    if (parts[2] === 'files' && parts[3]) {
      return {
        kind: 'project',
        projectId,
        fileName: decodeURIComponent(parts.slice(3).join('/')),
      };
    }
    return { kind: 'project', projectId, fileName: null };
  }
  return { kind: 'home' };
}

export function buildPath(route: Route): string {
  if (route.kind === 'home') return '/';
  if (route.kind === 'skills') return '/library/skills';
  if (route.kind === 'design-systems') return '/library/design-systems';
  
  const id = encodeURIComponent(route.projectId);
  if (route.fileName) {
    const file = route.fileName
      .split('/')
      .map((s) => encodeURIComponent(s))
      .join('/');
    return `/projects/${id}/files/${file}`;
  }
  return `/projects/${id}`;
}

export function navigate(route: Route, opts: { replace?: boolean } = {}): void {
  const target = buildPath(route);
  const current = window.location.pathname;
  if (target === current) return;
  if (opts.replace) {
    window.history.replaceState(null, '', target);
  } else {
    window.history.pushState(null, '', target);
  }
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.pathname));
  useEffect(() => {
    const onPop = () => setRoute(parseRoute(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  return route;
}
