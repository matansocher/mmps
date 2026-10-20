import { createWriteStream } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import yauzl from 'yauzl';
import type { Entry, ZipFile } from 'yauzl';
import type { GtfsLineReader } from './gtfs-parser';

function openZip(path: string): Promise<ZipFile> {
  return new Promise((resolve, reject) => yauzl.open(path, { lazyEntries: true, autoClose: false }, (err, zip) => (err ? reject(err) : resolve(zip))));
}

function readEntries(zip: ZipFile): Promise<Map<string, Entry>> {
  return new Promise((resolve, reject) => {
    const entries = new Map<string, Entry>();
    zip.on('entry', (entry: Entry) => {
      entries.set(entry.fileName, entry);
      zip.readEntry();
    });
    zip.on('end', () => resolve(entries));
    zip.on('error', reject);
    zip.readEntry();
  });
}

function openEntryStream(zip: ZipFile, entry: Entry): Promise<Readable> {
  return new Promise((resolve, reject) => zip.openReadStream(entry, (err, stream) => (err ? reject(err) : resolve(stream))));
}

// The feed is ~180MB zipped (stop_times alone is ~1GB unzipped), so it is streamed to disk and read entry by entry.
export async function withGtfsFeed<T>(url: string, consume: (readLines: GtfsLineReader) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'gtfs-'));
  const zipPath = join(dir, 'feed.zip');
  try {
    const response = await fetch(url);
    if (!response.ok || !response.body) throw new Error(`GTFS download failed: ${response.status} ${response.statusText}`);
    await pipeline(Readable.fromWeb(response.body as WebReadableStream), createWriteStream(zipPath));

    const zip = await openZip(zipPath);
    try {
      const entries = await readEntries(zip);
      const readLines: GtfsLineReader = async function* (fileName) {
        const entry = entries.get(fileName);
        if (!entry) throw new Error(`GTFS feed is missing ${fileName}`);
        const stream = await openEntryStream(zip, entry);
        yield* createInterface({ input: stream, crlfDelay: Infinity });
      };
      return await consume(readLines);
    } finally {
      zip.close();
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
