export type GameSettings = {
  readonly soundEnabled: boolean;
};

export type GameProfile = {
  readonly unlockedFloor: number;
  readonly bestTimes: Readonly<Record<string, number>>;
  readonly settings: GameSettings;
};

const STORAGE_KEY = 'ground-zero.profile.v1';

function defaultProfile(): GameProfile {
  return {
    unlockedFloor: 1,
    bestTimes: {},
    settings: {
      soundEnabled: true,
    },
  };
}

export function loadProfile(): GameProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProfile();
    const parsed = JSON.parse(raw) as Partial<GameProfile>;
    const defaults = defaultProfile();
    return {
      unlockedFloor: Math.max(1, Number(parsed.unlockedFloor) || 1),
      bestTimes: parsed.bestTimes && typeof parsed.bestTimes === 'object' ? parsed.bestTimes : {},
      settings: {
        soundEnabled: parsed.settings?.soundEnabled ?? defaults.settings.soundEnabled,
      },
    };
  } catch {
    return defaultProfile();
  }
}

function saveProfile(profile: GameProfile): GameProfile {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // The game remains playable when storage is unavailable.
  }
  return profile;
}

export function recordFloorCompletion(floorId: string, floorNumber: number, elapsedMs: number): GameProfile {
  const profile = loadProfile();
  const previousBest = profile.bestTimes[floorId];
  return saveProfile({
    ...profile,
    unlockedFloor: Math.max(profile.unlockedFloor, floorNumber + 1),
    bestTimes: {
      ...profile.bestTimes,
      [floorId]: previousBest === undefined ? elapsedMs : Math.min(previousBest, elapsedMs),
    },
  });
}

export function setSoundEnabled(soundEnabled: boolean): GameProfile {
  const profile = loadProfile();
  return saveProfile({
    ...profile,
    settings: {
      ...profile.settings,
      soundEnabled,
    },
  });
}
