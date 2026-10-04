import { useEffect } from 'react';

export function useFonts(href: string): void {
  useEffect(() => {
    if (document.querySelector(`link[data-font="${CSS.escape(href)}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.font = href;
    document.head.appendChild(link);
  }, [href]);
}
