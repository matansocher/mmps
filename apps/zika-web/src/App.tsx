import { lazy, Suspense, useEffect, type ComponentType, type LazyExoticComponent } from 'react';
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { Cover } from './cover/Cover.tsx';
import { ConceptSwitcher } from './lib/ConceptSwitcher.tsx';
import { isConceptSlug, type ConceptSlug } from './lib/concepts.ts';

type ConceptModule = { Home: ComponentType; Product: ComponentType };

const loaders: Record<ConceptSlug, () => Promise<ConceptModule>> = {
  bold: () => import('./concepts/bold/index.ts'),
  commerce: () => import('./concepts/commerce/index.ts'),
  catalog: () => import('./concepts/catalog/index.ts'),
  friendly: () => import('./concepts/friendly/index.ts'),
};

const pages = Object.fromEntries(
  Object.entries(loaders).map(([slug, load]) => [
    slug,
    {
      Home: lazy(async () => ({ default: (await load()).Home })),
      Product: lazy(async () => ({ default: (await load()).Product })),
    },
  ]),
) as Record<ConceptSlug, { Home: LazyExoticComponent<ComponentType>; Product: LazyExoticComponent<ComponentType> }>;

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

function ConceptPage({ page }: { page: 'Home' | 'Product' }) {
  const { concept } = useParams();
  if (!isConceptSlug(concept)) return <Navigate to="/" replace />;
  const Page = pages[concept][page];
  return (
    <>
      <Suspense fallback={<div style={{ minHeight: '100vh', background: '#111' }} aria-busy="true" />}>
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
        <Route path="/:concept" element={<ConceptPage page="Home" />} />
        <Route path="/:concept/product/z-11" element={<ConceptPage page="Product" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
