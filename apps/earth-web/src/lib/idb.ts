import type { ImportedLayer } from '../types';

const DB_NAME = 'earth';
const STORE = 'layers';

export type StoredLayer = ImportedLayer & { readonly blob: Blob };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export const listStoredLayers = () => run<StoredLayer[]>('readonly', (s) => s.getAll() as IDBRequest<StoredLayer[]>);
export const putStoredLayer = (layer: StoredLayer) => run('readwrite', (s) => s.put(layer));
export const deleteStoredLayer = (id: string) => run('readwrite', (s) => s.delete(id));
