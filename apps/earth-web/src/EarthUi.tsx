import { Cartesian3, ScreenSpaceEventHandler, ScreenSpaceEventType, defined, type Cartesian2, type DataSource, type Entity, type JulianDate } from 'cesium';
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent as ReactDragEvent } from 'react';
import { CameraHud } from './components/CameraHud';
import { InfoCard, type InfoCardData } from './components/InfoCard';
import { LayersPanel } from './components/LayersPanel';
import { MeasurePanel } from './components/MeasurePanel';
import { HelpDialog, Toasts } from './components/Overlays';
import { PlacesPanel } from './components/PlacesPanel';
import { Rail, type PanelId } from './components/Rail';
import { SearchBox } from './components/SearchBox';
import { TourBar } from './components/TourBar';
import { VoyagerPanel } from './components/VoyagerPanel';
import { flyToPlace, flyToTarget, getCameraView, nudge, resetNorth, toggleTilt, zoomBy } from './globe/camera';
import { EngineContext } from './globe/context';
import type { EarthEngine } from './globe/engine';
import { pickCartesian, pickScreenCenter, toPickedPoint } from './globe/pick';
import { usePlacemarks } from './hooks/usePlacemarks';
import { useSettings } from './hooks/useSettings';
import { useToasts } from './hooks/useToasts';
import { useUrlSync } from './hooks/useUrlSync';
import { useKeyboard } from './hooks/useKeyboard';
import { downloadBlob, downloadText, placemarksToGeoJson, placemarksToKml } from './lib/export';
import { deleteStoredLayer, listStoredLayers, putStoredLayer } from './lib/idb';
import { newId } from './lib/storage';
import { detectKind, loadLayerDataSource, MAX_IMPORT_BYTES } from './tools/importer';
import type { MeasureMode, MeasureResult } from './tools/measure';
import { PLACEMARK_ENTITY_PREFIX } from './tools/placemarks-layer';
import { captureScreenshot } from './tools/screenshot';
import { VOYAGER_STOPS, type VoyagerStop } from './voyager/catalog';
import { TourPlayer, type TourState } from './voyager/tour';
import type { EarthConfig, ImportedLayer, LatLon, MapStyle, PlaceTarget } from './types';

type Props = {
  readonly engine: EarthEngine;
  readonly config: EarthConfig;
};

type Selection = InfoCardData & { readonly placemarkId?: string; readonly height: number };

const BIAS_MAX_ALTITUDE_M = 2_000_000;

const minutesNow = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

// Cesium's typings declare Entity.description as a string, but at runtime it is a Property.
const readDescription = (entity: Entity, time: JulianDate): string | undefined => {
  const value = entity.description as unknown;
  if (typeof value === 'string') return value;
  const resolved = (value as { getValue?: (t: JulianDate) => unknown } | undefined)?.getValue?.(time);
  return typeof resolved === 'string' ? resolved : undefined;
};

const errorMessage = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback);

export function EarthUi({ engine, config }: Props) {
  const { viewer } = engine;
  const [settings, updateSettings] = useSettings();
  const { placemarks, add: addPlacemark, update: updatePlacemark, remove: removePlacemark } = usePlacemarks();
  const { toasts, show: toast, dismiss } = useToasts();
  const [effectiveStyle, setEffectiveStyle] = useState<MapStyle>(settings.mapStyle);
  const [panel, setPanel] = useState<PanelId | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [tour, setTour] = useState<TourState | null>(null);
  const [measureResult, setMeasureResult] = useState<MeasureResult | null>(null);
  const [layers, setLayers] = useState<ImportedLayer[]>([]);
  const [timeOfDay, setTimeOfDayState] = useState<number>(minutesNow);
  const [help, setHelp] = useState(false);
  const [fullscreen, setFullscreen] = useState(() => Boolean(document.fullscreenElement));
  const [locating, setLocating] = useState(false);
  const [dragging, setDragging] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const tourRef = useRef<TourPlayer | null>(null);
  const dataSources = useRef(new Map<string, DataSource>());

  useUrlSync(engine);

  useEffect(() => {
    if (engine.tilesetError) toast('Photorealistic 3D isn’t available right now — showing satellite imagery instead.', 'error');
  }, [engine, toast]);

  useEffect(() => {
    let active = true;
    void engine.applySettings(settings).then((style) => {
      if (active) setEffectiveStyle(style);
    });
    return () => {
      active = false;
    };
  }, [engine, settings]);

  useEffect(() => {
    engine.placemarks.sync(placemarks, selection?.placemarkId ?? null);
    viewer.scene.requestRender();
  }, [engine, viewer, placemarks, selection?.placemarkId]);

  useEffect(() => {
    const listener = (result: MeasureResult) => setMeasureResult(result);
    engine.measureListeners.add(listener);
    return () => {
      engine.measureListeners.delete(listener);
    };
  }, [engine]);

  // Measuring is active only while the Measure panel is open.
  useEffect(() => {
    if (panel !== 'measure') return;
    engine.measure.start(measureResult?.mode ?? 'line');
    return () => engine.measure.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, panel]);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => () => tourRef.current?.stop(), []);

  // Restore imported layers from IndexedDB.
  useEffect(() => {
    let cancelled = false;
    const sources = dataSources.current;
    void (async () => {
      try {
        const stored = await listStoredLayers();
        for (const { blob, ...layer } of stored) {
          if (cancelled) return;
          try {
            const ds = await loadLayerDataSource(viewer, layer, blob);
            if (cancelled) {
              viewer.dataSources.remove(ds, true);
              return;
            }
            ds.show = layer.visible;
            sources.set(layer.id, ds);
            setLayers((prev) => [...prev.filter((l) => l.id !== layer.id), layer]);
          } catch {
            // A corrupt stored layer shouldn't block the others.
          }
        }
        viewer.scene.requestRender();
      } catch {
        // IndexedDB can be unavailable (private mode); imports then last for the session only.
      }
    })();
    return () => {
      cancelled = true;
      if (!viewer.isDestroyed()) sources.forEach((ds) => viewer.dataSources.remove(ds, true));
      sources.clear();
    };
  }, [viewer]);

  const stopTour = useCallback(() => {
    tourRef.current?.stop();
    tourRef.current = null;
  }, []);

  const playStops = useCallback(
    (stops: readonly VoyagerStop[], from = 0) => {
      tourRef.current?.stop();
      setSelection(null);
      const player = new TourPlayer(viewer, stops, (state) => {
        setTour(state);
        if (!state && tourRef.current === player) tourRef.current = null;
      });
      tourRef.current = player;
      void player.play(from);
    },
    [viewer],
  );

  const placemarksById = useMemo(() => new Map(placemarks.map((p) => [p.id, p])), [placemarks]);
  const placemarksRef = useRef(placemarksById);
  useEffect(() => {
    placemarksRef.current = placemarksById;
  });

  const selectPlacemark = useCallback((id: string, fly: boolean) => {
    const p = placemarksRef.current.get(id);
    if (!p) return;
    setSelection({ lat: p.lat, lon: p.lon, height: p.height, title: p.name, description: p.description || undefined, saved: true, placemarkId: p.id });
    if (fly) void flyToTarget(viewer, { lat: p.lat, lon: p.lon, height: p.height, range: 1500, heading: 0, pitch: -45 });
  }, [viewer]);

  // Globe click / double-click handling (measure tool owns the clicks while active).
  useEffect(() => {
    if (panel === 'measure') return;
    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((e: { position: Cartesian2 }) => {
      const picked = viewer.scene.pick(e.position) as { id?: unknown } | undefined;
      const entity = defined(picked) && picked?.id && typeof picked.id === 'object' ? (picked.id as Entity) : null;
      if (entity && typeof entity.id === 'string' && entity.id.startsWith(PLACEMARK_ENTITY_PREFIX)) {
        selectPlacemark(entity.id.slice(PLACEMARK_ENTITY_PREFIX.length), false);
        return;
      }
      const cartesian = pickCartesian(viewer, e.position);
      if (entity && entity.entityCollection && entity.entityCollection !== viewer.entities) {
        const pos = entity.position?.getValue(viewer.clock.currentTime) ?? cartesian;
        const point = pos ? toPickedPoint(pos) : null;
        const description = readDescription(entity, viewer.clock.currentTime);
        if (point) {
          setSelection({ ...point, title: entity.name || 'Imported feature', description: typeof description === 'string' ? description : undefined, saved: false });
          return;
        }
      }
      if (!cartesian) {
        setSelection(null);
        return;
      }
      const point = toPickedPoint(cartesian);
      setSelection({ ...point, title: 'Dropped pin', saved: false });
    }, ScreenSpaceEventType.LEFT_CLICK);
    handler.setInputAction((e: { position: Cartesian2 }) => {
      const cartesian = pickCartesian(viewer, e.position);
      if (!cartesian) return;
      const camera = viewer.camera;
      const distance = Cartesian3.distance(camera.positionWC, cartesian);
      const direction = Cartesian3.normalize(Cartesian3.subtract(cartesian, camera.positionWC, new Cartesian3()), new Cartesian3());
      const destination = Cartesian3.add(camera.positionWC, Cartesian3.multiplyByScalar(direction, distance * 0.6, new Cartesian3()), new Cartesian3());
      camera.flyTo({ destination, orientation: { heading: camera.heading, pitch: camera.pitch, roll: 0 }, duration: 0.8 });
    }, ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
    return () => handler.destroy();
  }, [viewer, panel, selectPlacemark]);

  const getBias = useCallback((): LatLon | null => {
    const view = getCameraView(viewer);
    return view.altitude < BIAS_MAX_ALTITUDE_M ? { lat: view.lat, lon: view.lon } : null;
  }, [viewer]);

  const onSearchSelect = useCallback(
    (place: PlaceTarget) => {
      stopTour();
      setSelection({ lat: place.lat, lon: place.lon, height: 0, title: place.name, subtitle: place.address, saved: false });
      void flyToPlace(viewer, place);
    },
    [viewer, stopTour],
  );

  const togglePanel = useCallback((id: PanelId) => setPanel((current) => (current === id ? null : id)), []);

  const onLucky = useCallback(() => {
    const stop = VOYAGER_STOPS[Math.floor(Math.random() * VOYAGER_STOPS.length)];
    playStops([stop]);
  }, [playStops]);

  const onScreenshot = useCallback(async () => {
    try {
      const blob = await captureScreenshot(viewer);
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      downloadBlob(`earth-${stamp}.png`, blob);
      toast('Screenshot saved');
    } catch (err) {
      toast(errorMessage(err, 'Couldn’t capture a screenshot'), 'error');
    }
  }, [viewer, toast]);

  const onShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast('Link to this view copied');
    } catch {
      toast('Couldn’t access the clipboard — copy the address bar instead', 'error');
    }
  }, [toast]);

  const onFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => toast('Fullscreen isn’t available here', 'error'));
  }, [toast]);

  const onMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast('Location isn’t available in this browser', 'error');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        stopTour();
        setSelection({ lat: coords.latitude, lon: coords.longitude, height: 0, title: 'Your location', subtitle: `Accuracy ±${Math.round(coords.accuracy)} m`, saved: false });
        void flyToTarget(viewer, { lat: coords.latitude, lon: coords.longitude, height: 0, range: 3000, heading: 0, pitch: -45 });
      },
      (err) => {
        setLocating(false);
        toast(err.code === err.PERMISSION_DENIED ? 'Location permission denied' : 'Couldn’t find your location', 'error');
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }, [viewer, toast, stopTour]);

  const onTimeOfDay = useCallback(
    (minutes: number) => {
      setTimeOfDayState(minutes);
      const date = new Date();
      date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
      engine.setTimeOfDay(date);
    },
    [engine],
  );

  const importFiles = useCallback(
    async (files: FileList | readonly File[]) => {
      for (const file of Array.from(files)) {
        const kind = detectKind(file.name);
        if (!kind) {
          toast(`${file.name}: only KML, KMZ and GeoJSON files are supported`, 'error');
          continue;
        }
        if (file.size > MAX_IMPORT_BYTES) {
          toast(`${file.name} is larger than ${MAX_IMPORT_BYTES / 1024 / 1024} MB`, 'error');
          continue;
        }
        const layer: ImportedLayer = { id: newId(), name: file.name.replace(/\.(kml|kmz|geojson|json)$/i, ''), kind, visible: true, sizeBytes: file.size, addedAt: new Date().toISOString() };
        try {
          const ds = await loadLayerDataSource(viewer, layer, file);
          dataSources.current.set(layer.id, ds);
          setLayers((prev) => [...prev, layer]);
          await viewer.flyTo(ds, { duration: 2 });
          await putStoredLayer({ ...layer, blob: file }).catch(() => toast('Layer added, but it won’t be kept after reload (storage unavailable)', 'error'));
          toast(`Added “${layer.name}”`);
        } catch (err) {
          toast(`${file.name}: ${errorMessage(err, 'couldn’t be read')}`, 'error');
        }
      }
    },
    [viewer, toast],
  );

  const toggleLayer = useCallback(
    (id: string) => {
      setLayers((prev) =>
        prev.map((l) => {
          if (l.id !== id) return l;
          const next = { ...l, visible: !l.visible };
          const ds = dataSources.current.get(id);
          if (ds) ds.show = next.visible;
          void listStoredLayers()
            .then((stored) => stored.find((s) => s.id === id))
            .then((s) => (s ? putStoredLayer({ ...s, visible: next.visible }) : undefined))
            .catch(() => undefined);
          return next;
        }),
      );
      viewer.scene.requestRender();
    },
    [viewer],
  );

  const zoomLayer = useCallback(
    (id: string) => {
      const ds = dataSources.current.get(id);
      if (ds) void viewer.flyTo(ds, { duration: 2 });
    },
    [viewer],
  );

  const deleteLayer = useCallback(
    (id: string) => {
      const ds = dataSources.current.get(id);
      if (ds) viewer.dataSources.remove(ds, true);
      dataSources.current.delete(id);
      setLayers((prev) => prev.filter((l) => l.id !== id));
      void deleteStoredLayer(id).catch(() => undefined);
      viewer.scene.requestRender();
    },
    [viewer],
  );

  const addAtCenter = useCallback(() => {
    const center = pickScreenCenter(viewer);
    if (!center) {
      toast('Point the camera at the ground to add a placemark', 'error');
      return;
    }
    const point = toPickedPoint(center);
    const p = addPlacemark({ name: `Placemark ${placemarks.length + 1}`, lat: point.lat, lon: point.lon, height: point.height });
    setSelection({ ...point, title: p.name, saved: true, placemarkId: p.id });
  }, [viewer, addPlacemark, placemarks.length, toast]);

  const saveSelection = useCallback(() => {
    if (!selection || selection.saved) return;
    const p = addPlacemark({ name: selection.title === 'Dropped pin' ? `Placemark ${placemarks.length + 1}` : selection.title, description: selection.subtitle ?? selection.description, lat: selection.lat, lon: selection.lon, height: selection.height });
    setSelection({ ...selection, title: p.name, saved: true, placemarkId: p.id });
    toast('Saved to My places');
  }, [selection, addPlacemark, placemarks.length, toast]);

  const exportPlaces = useCallback(
    (format: 'kml' | 'geojson') => {
      if (format === 'kml') downloadText('my-places.kml', placemarksToKml(placemarks), 'application/vnd.google-earth.kml+xml');
      else downloadText('my-places.geojson', placemarksToGeoJson(placemarks), 'application/geo+json');
    },
    [placemarks],
  );

  const onMeasureMode = useCallback((mode: MeasureMode) => engine.measure.start(mode), [engine]);

  useKeyboard({
    '/': () => searchRef.current?.focus(),
    Escape: () => {
      if (document.activeElement === searchRef.current) searchRef.current?.blur();
      else if (help) setHelp(false);
      else if (tourRef.current) stopTour();
      else if (selection) setSelection(null);
      else setPanel(null);
    },
    n: () => resetNorth(viewer),
    u: () => toggleTilt(viewer),
    r: () => resetNorth(viewer),
    '+': () => zoomBy(viewer, 0.5),
    '=': () => zoomBy(viewer, 0.5),
    '-': () => zoomBy(viewer, 2),
    ArrowLeft: () => nudge(viewer, 'left'),
    ArrowRight: () => nudge(viewer, 'right'),
    ArrowUp: () => nudge(viewer, 'up'),
    ArrowDown: () => nudge(viewer, 'down'),
    '?': () => setHelp((h) => !h),
  });

  const onDragOver = (e: ReactDragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    setDragging(true);
  };

  return (
    <EngineContext.Provider value={engine}>
      <div
        className="pointer-events-none fixed inset-0 z-50"
        onDragOver={onDragOver}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) void importFiles(e.dataTransfer.files);
        }}
        style={{ pointerEvents: dragging ? 'auto' : undefined }}
      />
      <DropTarget onDragEnter={() => setDragging(true)} />

      <div className="fixed z-30 sm:top-4 sm:left-20 sm:w-[400px] max-sm:top-3 max-sm:right-3 max-sm:left-3">
        <SearchBox apiKey={config.googleMapsKey} placesEnabled={config.features.places} getBias={getBias} inputRef={searchRef} onSelect={onSearchSelect} onError={(m) => toast(m, 'error')} />
      </div>

      <Rail panel={panel} onPanel={togglePanel} onLucky={onLucky} onScreenshot={onScreenshot} onShare={onShare} onFullscreen={onFullscreen} fullscreen={fullscreen} onHelp={() => setHelp(true)} />

      {panel === 'layers' && (
        <LayersPanel
          settings={settings}
          effectiveStyle={effectiveStyle}
          photorealisticAvailable={Boolean(engine.tileset)}
          onSettings={updateSettings}
          timeOfDay={timeOfDay}
          onTimeOfDay={onTimeOfDay}
          layers={layers}
          onImport={(files) => void importFiles(files)}
          onToggleLayer={toggleLayer}
          onZoomLayer={zoomLayer}
          onDeleteLayer={deleteLayer}
          onClose={() => setPanel(null)}
        />
      )}
      {panel === 'places' && (
        <PlacesPanel
          placemarks={placemarks}
          selectedId={selection?.placemarkId ?? null}
          onSelect={(p) => selectPlacemark(p.id, true)}
          onUpdate={updatePlacemark}
          onDelete={(id) => {
            removePlacemark(id);
            if (selection?.placemarkId === id) setSelection(null);
          }}
          onAddAtCenter={addAtCenter}
          onExport={exportPlaces}
          onClose={() => setPanel(null)}
        />
      )}
      {panel === 'measure' && (
        <MeasurePanel result={measureResult} units={settings.units} onMode={onMeasureMode} onUndo={() => engine.measure.undo()} onClear={() => engine.measure.clear()} onClose={() => setPanel(null)} />
      )}
      {panel === 'voyager' && <VoyagerPanel tour={tour} onPlayTour={(stops) => { setPanel(null); playStops(stops); }} onVisit={(stop) => playStops([stop])} onClose={() => setPanel(null)} />}

      {selection && !tour && (
        <InfoCard
          data={selection}
          onClose={() => setSelection(null)}
          onSave={selection.saved ? undefined : saveSelection}
          onFlyTo={() => void flyToTarget(viewer, { lat: selection.lat, lon: selection.lon, height: selection.height, range: 1500, heading: 0, pitch: -45 })}
          onCopied={() => toast('Coordinates copied')}
        />
      )}

      {tour && <TourBar tour={tour} onPrev={() => tourRef.current?.previous()} onNext={() => tourRef.current?.next()} onStop={stopTour} />}

      <CameraHud
        engine={engine}
        units={settings.units}
        onResetNorth={() => resetNorth(viewer)}
        onToggleTilt={() => toggleTilt(viewer)}
        onZoomIn={() => zoomBy(viewer, 0.5)}
        onZoomOut={() => zoomBy(viewer, 2)}
        onMyLocation={onMyLocation}
        locating={locating}
      />

      {dragging && (
        <div className="pointer-events-none fixed inset-3 z-40 flex items-center justify-center rounded-3xl border-2 border-dashed border-[var(--color-accent)] bg-black/40 text-lg font-medium backdrop-blur-sm">
          Drop KML, KMZ or GeoJSON to add it as a layer
        </div>
      )}
      {help && <HelpDialog onClose={() => setHelp(false)} />}
      <Toasts toasts={toasts} onDismiss={dismiss} />
    </EngineContext.Provider>
  );
}

function DropTarget({ onDragEnter }: { readonly onDragEnter: () => void }) {
  useEffect(() => {
    const onEnter = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) onDragEnter();
    };
    window.addEventListener('dragenter', onEnter);
    return () => window.removeEventListener('dragenter', onEnter);
  }, [onDragEnter]);
  return null;
}
