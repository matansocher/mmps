import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

export function rewindOfflinePlugin(): Plugin {
  let root = '';
  return {
    name: 'rewind-offline',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      root = config.root;
    },
    generateBundle(_options, bundle) {
      const files = Object.keys(bundle).filter((name) => !name.endsWith('.map'));
      if (!files.includes('index.html')) throw new Error('Rewind offline build is missing its HTML shell');
      const hash = createHash('sha256');
      for (const file of files) {
        const entry = bundle[file];
        hash.update(entry.type === 'chunk' ? entry.code : entry.source);
      }
      for (const file of ['icon.svg', 'icon-192.png', 'icon-512.png', 'manifest.webmanifest']) {
        hash.update(readFileSync(path.join(root, 'public', file)));
        files.push(file);
      }
      const cache = `rewind-shell-${hash.digest('hex').slice(0, 16)}`;
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: `
const CACHE = ${JSON.stringify(cache)};
const FILES = ${JSON.stringify(files.map((file) => `/rewind/${file}`))};
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(FILES.map((url) => new Request(url, { cache: 'reload' })));
  })());
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('rewind-shell-') && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('message', (event) => {
  if (event.data === 'ACTIVATE_UPDATE') self.skipWaiting();
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate' && (url.pathname === '/rewind' || url.pathname.startsWith('/rewind/'))) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      return await cache.match('/rewind/index.html') || await fetch(event.request);
    })());
  } else if (FILES.includes(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      return await cache.match(url.pathname) || await fetch(event.request);
    })());
  }
});
`,
      });
    },
  };
}
