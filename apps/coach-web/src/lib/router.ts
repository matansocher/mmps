import { useEffect, useState } from 'react';

export type Route =
  | { readonly name: 'live' }
  | { readonly name: 'leagues' }
  | { readonly name: 'settings' }
  | { readonly name: 'game'; readonly id: number }
  | { readonly name: 'team'; readonly id: number }
  | { readonly name: 'player'; readonly id: number }
  | { readonly name: 'league'; readonly id: number };

export const TOP_LEVEL_ROUTES = new Set<Route['name']>(['live', 'leagues', 'settings']);

const DETAIL_ROUTES = new Set(['game', 'team', 'player', 'league']);
const ROUTE_CHANGE_EVENT = 'coach:route';

export function parseRoute(hash: string): Route {
  const [name, rawId] = hash.replace(/^#\/?/, '').split('/');
  const id = Number(rawId);
  if (DETAIL_ROUTES.has(name) && Number.isInteger(id) && id > 0) return { name, id } as Route;
  if (name === 'leagues' || name === 'settings') return { name };
  return { name: 'live' };
}

export function routePath(route: Route): string {
  return 'id' in route ? `#/${route.name}/${route.id}` : route.name === 'live' ? '#/' : `#/${route.name}`;
}

function historyDepth(): number {
  return (window.history.state as { depth?: number } | null)?.depth ?? 0;
}

// Each in-app navigation records its depth so back() can tell whether there is an in-app page to return to.
export function navigate(route: Route, options: { replace?: boolean } = {}): void {
  const path = routePath(route);
  if (path === (window.location.hash || '#/')) return;
  if (options.replace) window.history.replaceState({ depth: historyDepth() }, '', path);
  else window.history.pushState({ depth: historyDepth() + 1 }, '', path);
  window.dispatchEvent(new Event(ROUTE_CHANGE_EVENT));
}

export function goBack(): void {
  if (historyDepth() > 0) window.history.back();
  else navigate({ name: 'live' }, { replace: true });
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));
  useEffect(() => {
    const update = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('popstate', update);
    window.addEventListener('hashchange', update);
    window.addEventListener(ROUTE_CHANGE_EVENT, update);
    return () => {
      window.removeEventListener('popstate', update);
      window.removeEventListener('hashchange', update);
      window.removeEventListener(ROUTE_CHANGE_EVENT, update);
    };
  }, []);
  return route;
}
