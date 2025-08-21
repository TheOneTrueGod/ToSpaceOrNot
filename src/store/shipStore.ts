import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ShipState, Alert, Gauge } from '../types';
import { Asteroid } from './stations/weaponsStore';

const isGauge = (value: unknown): value is Gauge => {
  return typeof value === 'object' && value !== null && 'current' in value && 'max' in value;
};

const initialState: ShipState = {
  distanceToDestination: { current: 1000, max: 1000 },
  hullDamage: { current: 0, max: 100 },
  oxygenLevels: { current: 100, max: 100 },
  navigationAlignment: 100,
  fuelLevels: { current: 100, max: 100 },
  batteryPower: { current: 100, max: 100 },
  gameClock: { minutes: 0, seconds: 0 },
  alerts: []
};

const shipSlice = createSlice({
  name: 'ship',
  initialState,
  reducers: {
    advanceTime: (state) => {
      state.gameClock.seconds += 1;
      if (state.gameClock.seconds >= 60) {
        state.gameClock.seconds = 0;
        state.gameClock.minutes += 1;
      }
    },
    gameTick: (state) => {
      // Calculate power restoration for this tick
      const powerRestored = calculatePowerRestoration();
      state.batteryPower.current = Math.min(state.batteryPower.max, state.batteryPower.current + powerRestored);
    },
    handleAsteroidImpacts: (state, action: PayloadAction<{ asteroids: Asteroid[] }>) => {
      const { asteroids } = action.payload;
      const currentGameSeconds = state.gameClock.minutes * 60 + state.gameClock.seconds;
      
      // Check each asteroid for impact
      asteroids.forEach((asteroid: Asteroid) => {
        const asteroidImpactSeconds = asteroid.impactAt.minutes * 60 + asteroid.impactAt.seconds;
        if (asteroidImpactSeconds <= currentGameSeconds) {
          // Asteroid has impacted - calculate damage
          const damage = 5 + asteroid.layers.length;
          state.hullDamage.current = Math.min(state.hullDamage.max, state.hullDamage.current + damage);
        }
      });
    },
    addAlert: (state, action: PayloadAction<Alert>) => {
      state.alerts.push(action.payload);
    },
    removeAlert: (state, action: PayloadAction<string>) => {
      state.alerts = state.alerts.filter(alert => alert.id !== action.payload);
    },
    updateSystemValue: (state, action: PayloadAction<{
      system: keyof ShipState;
      value: number;
      isCurrentValue?: boolean;
    }>) => {
      const { system, value, isCurrentValue = true } = action.payload;
      const systemValue = state[system];

      if (isGauge(systemValue)) {
        if (isCurrentValue) {
          systemValue.current = Math.max(0, Math.min(systemValue.max, systemValue.current + value));
        } else {
          systemValue.max = Math.max(0, systemValue.max + value);
        }
      } else if (system === 'navigationAlignment') {
        state.navigationAlignment = Math.max(0, Math.min(100, state.navigationAlignment + value));
      }
    },
    resetShipState: () => initialState
  }
});

// Helper function to calculate power restoration per second
const calculatePowerRestoration = (): number => {
  // For now, return a constant value of 1
  // This can be expanded later to consider engineering systems, alerts, etc.
  return 5;
};

export const { advanceTime, gameTick, handleAsteroidImpacts, addAlert, removeAlert, updateSystemValue, resetShipState } = shipSlice.actions;
export default shipSlice.reducer;