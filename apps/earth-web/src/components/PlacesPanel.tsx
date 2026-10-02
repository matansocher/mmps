import { useState } from 'react';
import { PLACEMARK_COLORS } from '../hooks/usePlacemarks';
import { formatLatLonDms } from '../lib/coordinates';
import type { Placemark } from '../types';
import { Drawer } from './Drawer';
import { Icon } from './Icon';

type Props = {
  readonly placemarks: readonly Placemark[];
  readonly selectedId: string | null;
  readonly onSelect: (p: Placemark) => void;
  readonly onUpdate: (id: string, patch: Partial<Pick<Placemark, 'name' | 'description' | 'color'>>) => void;
  readonly onDelete: (id: string) => void;
  readonly onAddAtCenter: () => void;
  readonly onExport: (format: 'kml' | 'geojson') => void;
  readonly onClose: () => void;
};

function Editor({ placemark, onUpdate, onDone }: { readonly placemark: Placemark; readonly onUpdate: Props['onUpdate']; readonly onDone: () => void }) {
  const [name, setName] = useState(placemark.name);
  const [description, setDescription] = useState(placemark.description);
  return (
    <form
      className="space-y-2 px-4 py-3"
      onSubmit={(e) => {
        e.preventDefault();
        onUpdate(placemark.id, { name: name.trim() || placemark.name, description });
        onDone();
      }}
    >
      <input className="field" value={name} onChange={(e) => setName(e.target.value)} aria-label="Name" autoFocus maxLength={120} />
      <textarea className="field min-h-[64px] resize-y" value={description} onChange={(e) => setDescription(e.target.value)} aria-label="Description" placeholder="Notes" maxLength={2000} />
      <div className="flex items-center gap-1.5">
        {PLACEMARK_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Color ${c}`}
            aria-pressed={placemark.color === c}
            onClick={() => onUpdate(placemark.id, { color: c })}
            className={`h-6 w-6 rounded-full border-2 ${placemark.color === c ? 'border-white' : 'border-transparent'}`}
            style={{ background: c }}
          />
        ))}
        <span className="flex-1" />
        <button type="button" className="chip" onClick={onDone}>
          Cancel
        </button>
        <button type="submit" className="chip" aria-pressed="true">
          Save
        </button>
      </div>
    </form>
  );
}

export function PlacesPanel({ placemarks, selectedId, onSelect, onUpdate, onDelete, onAddAtCenter, onExport, onClose }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <Drawer title="My places" onClose={onClose}>
      <div className="flex gap-2 px-4 py-3">
        <button type="button" className="chip flex items-center gap-1.5" onClick={onAddAtCenter}>
          <Icon name="addPin" size={16} /> Add at center
        </button>
        <span className="flex-1" />
        <button type="button" className="chip" disabled={!placemarks.length} onClick={() => onExport('kml')}>
          KML
        </button>
        <button type="button" className="chip" disabled={!placemarks.length} onClick={() => onExport('geojson')}>
          GeoJSON
        </button>
      </div>
      {placemarks.length === 0 && (
        <div className="px-6 py-8 text-center text-sm text-white/50">
          <Icon name="bookmark" size={32} className="mx-auto mb-2 text-white/30" />
          Click anywhere on the globe and choose “Save” to keep places here. Saved places stay in this browser.
        </div>
      )}
      <ul>
        {placemarks.map((p) =>
          editing === p.id ? (
            <li key={p.id} className="bg-white/5">
              <Editor placemark={p} onUpdate={onUpdate} onDone={() => setEditing(null)} />
            </li>
          ) : (
            <li key={p.id} className={`group flex items-center gap-2 py-1.5 pr-2 pl-4 hover:bg-white/5 ${selectedId === p.id ? 'bg-white/10' : ''}`}>
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: p.color }} />
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onSelect(p)}>
                <span className="block truncate text-sm">{p.name}</span>
                <span className="block truncate text-[11px] text-white/45">{formatLatLonDms(p)}</span>
              </button>
              <button type="button" className="icon-btn h-8 w-8" aria-label={`Edit ${p.name}`} onClick={() => setEditing(p.id)}>
                <Icon name="edit" size={16} />
              </button>
              <button type="button" className="icon-btn h-8 w-8" aria-label={`Delete ${p.name}`} onClick={() => onDelete(p.id)}>
                <Icon name="trash" size={16} />
              </button>
            </li>
          ),
        )}
      </ul>
    </Drawer>
  );
}
