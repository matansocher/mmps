import { useRef } from 'react';
import type { ImportedLayer, MapStyle, Settings } from '../types';
import { Drawer, SectionTitle, Toggle } from './Drawer';
import { Icon } from './Icon';

const STYLES: ReadonlyArray<{ readonly id: MapStyle; readonly label: string; readonly swatch: string }> = [
  { id: 'photorealistic', label: '3D', swatch: 'linear-gradient(135deg,#3b5d3a,#8a7a5c 45%,#c9c3b5 60%,#4a6b8a)' },
  { id: 'satellite', label: 'Satellite', swatch: 'linear-gradient(135deg,#1f3b2a,#3d5c3a 40%,#20456b)' },
  { id: 'hybrid', label: 'Hybrid', swatch: 'linear-gradient(135deg,#1f3b2a,#3d5c3a 40%,#20456b), repeating-linear-gradient(45deg,transparent 0 9px,#fde68a 9px 10px)' },
  { id: 'roadmap', label: 'Map', swatch: 'linear-gradient(135deg,#e8eaed,#cfe3c6 45%,#a8d1f0)' },
];

type Props = {
  readonly settings: Settings;
  readonly effectiveStyle: MapStyle;
  readonly photorealisticAvailable: boolean;
  readonly onSettings: (patch: Partial<Settings>) => void;
  readonly timeOfDay: number; // minutes since local midnight
  readonly onTimeOfDay: (minutes: number) => void;
  readonly layers: readonly ImportedLayer[];
  readonly onImport: (files: FileList) => void;
  readonly onToggleLayer: (id: string) => void;
  readonly onZoomLayer: (id: string) => void;
  readonly onDeleteLayer: (id: string) => void;
  readonly onClose: () => void;
};

const formatTime = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

export function LayersPanel(props: Props) {
  const { settings, effectiveStyle, photorealisticAvailable, onSettings } = props;
  const fileInput = useRef<HTMLInputElement>(null);
  return (
    <Drawer title="Map style" onClose={props.onClose}>
      <div className="grid grid-cols-4 gap-2 px-4 pt-4">
        {STYLES.map((s) => {
          const disabled = s.id === 'photorealistic' && !photorealisticAvailable;
          const selected = effectiveStyle === s.id;
          return (
            <button
              key={s.id}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              onClick={() => onSettings({ mapStyle: s.id })}
              className="group flex flex-col items-center gap-1.5 disabled:opacity-40"
              title={disabled ? '3D tiles are unavailable for this key' : s.label}
            >
              <span className={`block h-14 w-full rounded-xl border-2 ${selected ? 'border-[var(--color-accent)]' : 'border-transparent group-hover:border-white/30'}`} style={{ background: s.swatch }} />
              <span className={`text-xs ${selected ? 'text-[var(--color-accent)]' : 'text-white/75'}`}>{s.label}</span>
            </button>
          );
        })}
      </div>

      <SectionTitle>Layers</SectionTitle>
      <Toggle label="Place labels" checked={settings.labels} onChange={(labels) => onSettings({ labels })} hint="Countries and cities" />
      <Toggle label="Borders" checked={settings.borders} onChange={(borders) => onSettings({ borders })} />
      <Toggle label="Gridlines" checked={settings.grid} onChange={(grid) => onSettings({ grid })} hint="Latitude / longitude every 15°" />
      <Toggle label="Atmosphere" checked={settings.atmosphere} onChange={(atmosphere) => onSettings({ atmosphere })} />
      <Toggle label="Sunlight" checked={settings.sunLighting} onChange={(sunLighting) => onSettings({ sunLighting })} hint="Day and night shading" />
      {settings.sunLighting && (
        <div className="px-4 pt-1 pb-3">
          <div className="mb-1 flex justify-between text-xs text-white/55">
            <span>Time of day (local)</span>
            <span className="tabular-nums">{formatTime(props.timeOfDay)}</span>
          </div>
          <input type="range" min={0} max={1439} step={5} value={props.timeOfDay} onChange={(e) => props.onTimeOfDay(Number(e.target.value))} className="w-full accent-[var(--color-accent-strong)]" aria-label="Time of day" />
        </div>
      )}

      <SectionTitle>Units</SectionTitle>
      <div className="flex gap-2 px-4 pb-2">
        {(['metric', 'imperial'] as const).map((u) => (
          <button key={u} type="button" className="chip capitalize" aria-pressed={settings.units === u} onClick={() => onSettings({ units: u })}>
            {u}
          </button>
        ))}
      </div>

      <SectionTitle>Imported data</SectionTitle>
      <ul className="pb-1">
        {props.layers.map((layer) => (
          <li key={layer.id} className="flex items-center gap-1 py-1 pr-2 pl-4 hover:bg-white/5">
            <button type="button" className="min-w-0 flex-1 truncate text-left text-sm" onClick={() => props.onZoomLayer(layer.id)} title="Fly to layer">
              {layer.name}
              <span className="ml-2 text-[11px] text-white/40 uppercase">{layer.kind}</span>
            </button>
            <button type="button" className="icon-btn h-8 w-8" aria-label={layer.visible ? 'Hide layer' : 'Show layer'} onClick={() => props.onToggleLayer(layer.id)}>
              <Icon name={layer.visible ? 'eye' : 'eyeOff'} size={18} />
            </button>
            <button type="button" className="icon-btn h-8 w-8" aria-label="Delete layer" onClick={() => props.onDeleteLayer(layer.id)}>
              <Icon name="trash" size={18} />
            </button>
          </li>
        ))}
      </ul>
      <div className="px-4 pb-4">
        <button type="button" className="chip flex w-full items-center justify-center gap-2 py-2" onClick={() => fileInput.current?.click()}>
          <Icon name="upload" size={18} /> Import KML, KMZ or GeoJSON
        </button>
        <p className="mt-2 text-xs text-white/40">You can also drop files onto the map. Files stay in this browser.</p>
        <input
          ref={fileInput}
          type="file"
          accept=".kml,.kmz,.geojson,.json,application/vnd.google-earth.kml+xml,application/vnd.google-earth.kmz,application/geo+json"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length) props.onImport(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
    </Drawer>
  );
}
