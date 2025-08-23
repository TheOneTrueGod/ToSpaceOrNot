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
  severity: 'Warning' | 'Danger' | 'Critical';
  owner: 'Gobi' | 'Ben';
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

export type Player = 'Gobi' | 'Ben';

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