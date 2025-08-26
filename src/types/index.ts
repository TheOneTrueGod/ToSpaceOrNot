// Narrow type for ship systems that use { current, max }
export type Gauge = { current: number; max: number };
export interface ShipState {
  distanceToDestination: Gauge;
  hullDamage: Gauge;
  oxygenLevels: Gauge;
  navigationAlignment: number; // percentage
  fuelLevels: Gauge;
  batteryPower: Gauge;
  gameClock: { minutes: number; seconds: number };
  alerts: Alert[];
  isOnBreak: boolean;
}

export interface Alert {
  id: string;
  name: string;
  timestamp: { minutes: number; seconds: number };
  description: string;
  severity: 'Warning' | 'Danger' | 'Critical' | 'Success';
  owner: Player;
  systemEffects: SystemEffect[];
  isActive: boolean;
  type: 'manual' | 'automatic'; // Distinguishes DM-created vs status effect alerts
}

export interface SystemEffect {
  system: keyof ShipState;
  changePerInterval: number;
  maxValue?: number;
  minValue?: number;
}

// Player constants
export const Players = {
  PLAYER_ONE: 'Albatross' as const,
  PLAYER_TWO: 'Kestrel' as const,
} as const;

export type Player = typeof Players.PLAYER_ONE | typeof Players.PLAYER_TWO;

export type StationType = 'Engineering' | 'Navigation' | 'Weapons' | 'Science';

export interface StationState {
  [key: string]: unknown;
}

export interface GameState {
  currentPlayer: Player | null;
  currentPage: string;
}

export interface SystemChangeIndicator {
  direction: 'increasing' | 'decreasing' | 'stable';
  intensity: number; // 0-3 chevrons
}

// Ship quadrants based on distance traveled
export enum Quadrant {
  Alpha = 'Alpha',    // 0-250 km
  Beta = 'Beta',      // 250-500 km
  Gamma = 'Gamma',    // 500-750 km
  Delta = 'Delta'     // 750-1000 km
}

// Quadrant distance boundaries
export const QUADRANT_BOUNDARIES = {
  [Quadrant.Alpha]: { min: 0, max: 250 },
  [Quadrant.Beta]: { min: 250, max: 500 },
  [Quadrant.Gamma]: { min: 500, max: 750 },
  [Quadrant.Delta]: { min: 750, max: 1000 }
} as const;

// Helper function to get current quadrant based on distance traveled
export function getQuadrant(distanceTraveled: number): Quadrant {
  if (distanceTraveled < 250) return Quadrant.Alpha;
  if (distanceTraveled < 500) return Quadrant.Beta;
  if (distanceTraveled < 750) return Quadrant.Gamma;
  return Quadrant.Delta;
}