import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { WEAPONS_CANVAS_WIDTH, WEAPONS_CANVAS_HEIGHT } from "../../constants/weaponsCanvas";

export type WeaponType = "Phasers" | "Missiles" | "Railgun";

export type MaterialType = "Crystal" | "Alloy" | "Stone";

export const WEAPON_COLORS: Record<WeaponType, string> = {
  Phasers: "#ef4444",
  Missiles: "#3b82f6",
  Railgun: "#10b981",
};

export const WEAPON_POWER_REQUIREMENTS: Record<WeaponType, number> = {
  Phasers: 30,
  Missiles: 30,
  Railgun: 30,
};

export const MATERIAL_WEAKNESS: Record<MaterialType, WeaponType> = {
  Crystal: "Phasers",
  Alloy: "Missiles",
  Stone: "Railgun",
};

export interface Asteroid {
  id: string;
  layers: MaterialType[]; // outermost layer is layers[0]
  createdAt: { minutes: number; seconds: number };
  impactAt: { minutes: number; seconds: number };
  position: { x: number; y: number }; // center position in px
  size: number; // diameter in px (40-80)
  initialLayerCount: number;
}

export interface WeaponsState {
  asteroids: Asteroid[];
  cooldownUntil: Record<WeaponType, number>; // game time in total seconds when weapon becomes ready
  cooldownStartedAt: Record<WeaponType, number>; // game time in total seconds when cooldown started
  cooldownDuration: Record<WeaponType, number>; // total cooldown duration in seconds (including penalty)
}

const toGameSeconds = (t: { minutes: number; seconds: number }): number =>
  t.minutes * 60 + t.seconds;

const fromGameSeconds = (
  total: number
): { minutes: number; seconds: number } => ({
  minutes: Math.floor(total / 60),
  seconds: total % 60,
});

const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const pickRandomMaterial = (): MaterialType => {
  const mats: MaterialType[] = ["Crystal", "Alloy", "Stone"];
  return mats[randomInt(0, mats.length - 1)];
};

const SPAWN_CANVAS = { width: WEAPONS_CANVAS_WIDTH, height: WEAPONS_CANVAS_HEIGHT };

const initialState: WeaponsState = {
  asteroids: [],
  cooldownUntil: {
    Phasers: 0,
    Missiles: 0,
    Railgun: 0,
  },
  cooldownStartedAt: {
    Phasers: 0,
    Missiles: 0,
    Railgun: 0,
  },
  cooldownDuration: {
    Phasers: 0,
    Missiles: 0,
    Railgun: 0,
  },
};

export const weaponsSlice = createSlice({
  name: "weapons",
  initialState,
  reducers: {
    setWeaponCooldown: (
      state,
      action: PayloadAction<{
        weapon: WeaponType;
        cooldownSeconds: number;
        currentGameSeconds: number;
        engineeringPenalty?: number;
      }>
    ) => {
      const {
        weapon,
        cooldownSeconds,
        currentGameSeconds,
        engineeringPenalty = 1,
      } = action.payload;

      // Apply engineering penalty to weapon cooldown
      const actualCooldown = Math.round(cooldownSeconds * engineeringPenalty);
      
      // Track cooldown timing for progress bar
      state.cooldownStartedAt[weapon] = currentGameSeconds;
      state.cooldownDuration[weapon] = actualCooldown;
      state.cooldownUntil[weapon] = currentGameSeconds + actualCooldown;
    },
    spawnAsteroid: (
      state,
      action: PayloadAction<{
        currentGameTime: { minutes: number; seconds: number };
        impactInSeconds?: number;
        override?: Partial<Asteroid>;
      }>
    ) => {
      const {
        currentGameTime,
        impactInSeconds = randomInt(20, 90),
        override,
      } = action.payload;
      const layerCount = override?.initialLayerCount ?? randomInt(1, 4);
      const layers: MaterialType[] = Array.from({ length: layerCount }, () =>
        pickRandomMaterial()
      );
      const baseSize = 40 + layerCount * 6; // influenced by layer count
      const size = override?.size ?? Math.min(80, baseSize + randomInt(0, 20));
      const radius = size / 2;
      const width = SPAWN_CANVAS.width;
      const height = SPAWN_CANVAS.height;
      const position = override?.position ?? {
        x: randomInt(radius, width - radius),
        y: randomInt(radius, height - radius),
      };

      const createdAt = override?.createdAt ?? currentGameTime;
      const createdSec = toGameSeconds(createdAt);
      const impactAt =
        override?.impactAt ?? fromGameSeconds(createdSec + impactInSeconds);

      const asteroid: Asteroid = {
        id:
          override?.id ??
          `ast_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        layers,
        createdAt,
        impactAt,
        position,
        size,
        initialLayerCount: layerCount,
      };

      state.asteroids.push(asteroid);
    },
    popAsteroidLayer: (
      state,
      action: PayloadAction<{ asteroidId: string }>
    ) => {
      const asteroid = state.asteroids.find(
        (a) => a.id === action.payload.asteroidId
      );
      if (!asteroid) return;

      // Calculate the size reduction based on the destroyed layer
      const layerGap = Math.max(
        6,
        Math.floor(asteroid.size / 2 / Math.max(asteroid.initialLayerCount, 1))
      );
      const layerWidth = Math.max(4, Math.floor(layerGap * 0.6));
      const sizeReduction = layerGap + layerWidth; // Total space taken by the destroyed layer

      // Reduce asteroid size
      asteroid.size = Math.max(20, asteroid.size - sizeReduction);

      // Remove the outermost layer
      asteroid.layers.shift();

      if (asteroid.layers.length === 0) {
        state.asteroids = state.asteroids.filter((a) => a.id !== asteroid.id);
      }
    },
    removeAsteroid: (state, action: PayloadAction<{ asteroidId: string }>) => {
      state.asteroids = state.asteroids.filter(
        (a) => a.id !== action.payload.asteroidId
      );
    },
  },
});

export const {
  setWeaponCooldown,
  spawnAsteroid,
  popAsteroidLayer,
  removeAsteroid,
} = weaponsSlice.actions;
export default weaponsSlice.reducer;

// Power management functions
export const hasEnoughPower = (
  weapon: WeaponType,
  currentPower: number
): boolean => {
  return currentPower >= WEAPON_POWER_REQUIREMENTS[weapon];
};

export const getWeaponPowerCost = (weapon: WeaponType): number => {
  return WEAPON_POWER_REQUIREMENTS[weapon];
};

// Placeholder weapon functionality checks
// These will eventually reference other stores like stationStore or engineeringStore to determine functionality.
// const selectEngineeringPanels = (state: any) => state.station.stationStates.Engineering;
export const isWeaponPhasersFunctional = (): boolean => {
  return true;
};

export const isWeaponMissilesFunctional = (): boolean => {
  return true;
};

export const isWeaponRailgunFunctional = (): boolean => {
  return true;
};
