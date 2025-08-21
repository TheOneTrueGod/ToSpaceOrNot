import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ShipState, Alert, Gauge } from '../types';

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

export const { advanceTime, addAlert, removeAlert, updateSystemValue, resetShipState } = shipSlice.actions;
export default shipSlice.reducer;