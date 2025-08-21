export interface ShipState {
  distanceToDestination: { current: number; max: number };
  hullDamage: { current: number; max: number };
  oxygenLevels: { current: number; max: number };
  navigationAlignment: number; // percentage
  fuelLevels: { current: number; max: number };
  batteryPower: { current: number; max: number };
  gameClock: { minutes: number; seconds: number };
  alerts: Alert[];
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