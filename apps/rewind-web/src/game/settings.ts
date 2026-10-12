export type Settings = { readonly sound: boolean; readonly reducedMotion: boolean };
export const SETTINGS_KEY = 'rewind.settings.v1';
export const DEFAULT_SETTINGS: Settings = { sound: false, reducedMotion: false };

export function readSettings(storage: Pick<Storage, 'getItem'>): Settings {
  const raw = storage.getItem(SETTINGS_KEY);
  if (!raw) return DEFAULT_SETTINGS;
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || !('sound' in value) || !('reducedMotion' in value) || typeof value.sound !== 'boolean' || typeof value.reducedMotion !== 'boolean')
    throw new Error('Invalid saved settings');
  return { sound: value.sound, reducedMotion: value.reducedMotion };
}
export function saveSettings(storage: Pick<Storage, 'setItem'>, settings: Settings): void {
  storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
