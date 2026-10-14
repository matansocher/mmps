import { lazy, Suspense, useEffect, type ComponentType, type LazyExoticComponent } from 'react';
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { Cover } from './cover/Cover.tsx';
import { ConceptSwitcher } from './lib/ConceptSwitcher.tsx';
import { isConceptSlug, type ConceptSlug } from './lib/concepts.ts';

const loaders: Record<ConceptSlug, () => Promise<{ Home: ComponentType }>> = {
  lumen: () => import('./concepts/lumen/index.ts'),
  claimsight: () => import('./concepts/claimsight/index.ts'),
};

const pages = Object.fromEntries(Object.entries(loaders).map(([slug, load]) => [slug, lazy(async () => ({ default: (await load()).Home }))])) as Record<
  ConceptSlug,
  LazyExoticComponent<ComponentType>
>;

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
      return;
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

function ConceptPage() {
  const { concept } = useParams();
  if (!isConceptSlug(concept)) return <Navigate to="/" replace />;
  const Page = pages[concept];
  return (
    <>
      <Suspense fallback={<div style={{ minHeight: '100vh' }} aria-busy="true" />}>
        <Page />
      </Suspense>
      <ConceptSwitcher current={concept} />
    </>
  );
}

export function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Cover />} />
        <Route path="/:concept" element={<ConceptPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
