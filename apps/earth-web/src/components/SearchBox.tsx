import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from 'react';
import { formatLatLonDecimal, parseCoordinates } from '../lib/coordinates';
import { autocompletePlaces, getPlaceDetails } from '../lib/places';
import { isArray, isRecord, newId, readJson, writeJson } from '../lib/storage';
import type { LatLon, PlaceTarget, SearchResult } from '../types';
import { Icon } from './Icon';

type Recent = PlaceTarget & { readonly id: string };

const isRecentList = (v: unknown): v is Recent[] => isArray(v) && v.every((r) => isRecord(r) && typeof r.name === 'string' && typeof r.lat === 'number' && typeof r.lon === 'number');

type Props = {
  readonly apiKey: string;
  readonly placesEnabled: boolean;
  readonly getBias: () => LatLon | null;
  readonly inputRef: RefObject<HTMLInputElement | null>;
  readonly onSelect: (place: PlaceTarget) => void;
  readonly onError: (message: string) => void;
};

export function SearchBox({ apiKey, placesEnabled, getBias, inputRef, onSelect, onError }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const [recents, setRecents] = useState<Recent[]>(() => readJson('recents', [], isRecentList));
  const sessionToken = useRef(newId());
  const listId = useId();
  const getBiasRef = useRef(getBias);
  useEffect(() => {
    getBiasRef.current = getBias;
  });

  const trimmed = query.trim();
  const coordinates = trimmed ? parseCoordinates(trimmed) : null;

  useEffect(() => {
    if (!trimmed || coordinates || !placesEnabled) {
      setResults([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        setResults(await autocompletePlaces(apiKey, trimmed, sessionToken.current, controller.signal, getBiasRef.current() ?? undefined));
      } catch (err) {
        if (!controller.signal.aborted) {
          setResults([]);
          onError(err instanceof Error ? err.message : 'Search failed');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 220);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmed, apiKey, placesEnabled]);

  const items: SearchResult[] = coordinates
    ? [{ id: 'coords', primary: formatLatLonDecimal(coordinates, 5), secondary: 'Go to coordinates', kind: 'coordinates', coordinates }]
    : trimmed
      ? results
      : recents.map((r) => ({ id: r.id, primary: r.name, secondary: r.address ?? '', kind: 'recent' as const, coordinates: { lat: r.lat, lon: r.lon } }));

  useEffect(() => setActive(0), [items.length, trimmed]);

  const remember = (place: PlaceTarget) => {
    const next = [{ ...place, id: newId() }, ...recents.filter((r) => r.name !== place.name)].slice(0, 8);
    setRecents(next);
    writeJson('recents', next);
  };

  const finish = (place: PlaceTarget) => {
    remember(place);
    onSelect(place);
    setQuery(place.name);
    setOpen(false);
    inputRef.current?.blur();
    sessionToken.current = newId();
  };

  const choose = async (item: SearchResult) => {
    if (item.kind === 'coordinates' && item.coordinates) return finish({ ...item.coordinates, name: item.primary });
    if (item.kind === 'recent') {
      const recent = recents.find((r) => r.id === item.id);
      if (recent) finish(recent);
      return;
    }
    try {
      setLoading(true);
      finish(await getPlaceDetails(apiKey, item.id, sessionToken.current));
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not open place');
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (event.key === 'Enter') {
      const item = items[active];
      if (item) void choose(item);
    } else if (event.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const showList = open && (items.length > 0 || (trimmed && !loading && !coordinates));

  return (
    <div className="relative w-full">
      <div className="glass flex h-12 items-center gap-1 rounded-full pr-1 pl-4">
        <Icon name="search" size={20} className="shrink-0 text-white/60" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          placeholder={placesEnabled ? 'Search places or coordinates' : 'Search coordinates (e.g. 31.77, 35.21)'}
          className="h-full min-w-0 flex-1 bg-transparent px-2 text-[15px] text-white placeholder:text-white/45 focus:outline-none"
          role="combobox"
          aria-expanded={Boolean(showList)}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label="Search Earth"
          spellCheck={false}
          autoComplete="off"
        />
        {loading && <span className="mr-1 h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-[var(--color-accent)]" aria-label="Loading" />}
        {query && (
          <button
            type="button"
            className="icon-btn h-9 w-9"
            aria-label="Clear search"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
          >
            <Icon name="close" size={18} />
          </button>
        )}
      </div>
      {showList && (
        <div className="glass scroll-thin absolute top-14 right-0 left-0 z-30 max-h-[60vh] overflow-y-auto rounded-2xl py-2">
          {!trimmed && items.length > 0 && <div className="px-4 pt-1 pb-2 text-xs font-medium tracking-wide text-white/45 uppercase">Recent</div>}
          <ul id={listId} role="listbox">
            {items.map((item, index) => (
              <li key={item.id} role="option" aria-selected={index === active}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => void choose(item)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left ${index === active ? 'bg-white/10' : ''}`}
                >
                  <Icon name={item.kind === 'recent' ? 'history' : item.kind === 'coordinates' ? 'target' : 'pin'} size={18} className="shrink-0 text-white/55" />
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] text-white">{item.primary}</span>
                    {item.secondary && <span className="block truncate text-[12px] text-white/50">{item.secondary}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {trimmed && !coordinates && !loading && items.length === 0 && <div className="px-4 py-3 text-sm text-white/55">No results for “{trimmed}”</div>}
          {trimmed && !coordinates && items.length > 0 && <div className="px-4 pt-2 text-right text-[11px] text-white/40">Powered by Google</div>}
        </div>
      )}
    </div>
  );
}
