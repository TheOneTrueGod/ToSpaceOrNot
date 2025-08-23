import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ShipState, Alert, Gauge } from "../types";
import { Asteroid } from "./stations/weaponsStore";

const isGauge = (value: unknown): value is Gauge => {
  return (
    typeof value === "object" &&
    value !== null &&
    "current" in value &&
    "max" in value
  );
};

// Break point constants - ship pauses at these distances traveled
export const BREAK_POINTS = [250, 500, 750] as const;

const initialState: ShipState = {
  distanceToDestination: { current: 1000, max: 1000 },
  hullDamage: { current: 0, max: 100 },
  oxygenLevels: { current: 100, max: 100 },
  navigationAlignment: 100,
  fuelLevels: { current: 100, max: 100 },
  batteryPower: { current: 100, max: 100 },
  gameClock: { minutes: 0, seconds: 0 },
  alerts: [],
  isOnBreak: false,
};

const shipSlice = createSlice({
  name: "ship",
  initialState,
  reducers: {
    advanceTime: (state) => {
      state.gameClock.seconds += 1;
      if (state.gameClock.seconds >= 60) {
        state.gameClock.seconds = 0;
        state.gameClock.minutes += 1;
      }
    },
    gameTick: (state, action: PayloadAction<{ engineeringPenalty?: number; scienceCorrect?: boolean }> = { type: '', payload: {} }) => {
      const { engineeringPenalty = 1, scienceCorrect = true } = action.payload;
      
      // Calculate power restoration for this tick
      const powerRestored = calculatePowerRestoration(engineeringPenalty, scienceCorrect);
      state.batteryPower.current = Math.min(
        state.batteryPower.max,
        state.batteryPower.current + powerRestored
      );

      // Check if power generation is below 50% of expected and add alert if needed
      const baselineRecovery = 5;
      const expectedPower = baselineRecovery; // Expected power without penalties
      if (powerRestored < expectedPower * 0.5) {
        // Add low power alert if it doesn't already exist
        const hasLowPowerAlert = state.alerts.some(
          (alert) => alert.name === "Low Power Generation" && alert.isActive
        );
        if (!hasLowPowerAlert) {
          const lowPowerAlert: Alert = {
            id: `low-power-${Date.now()}`,
            name: "Low Power Generation",
            timestamp: state.gameClock,
            description:
              "Power generation is significantly below expected levels. Check engineering systems.",
            severity: "Warning",
            owner: "Gobi",
            systemEffects: [],
            isActive: true,
            type: "automatic",
          };
          state.alerts.push(lowPowerAlert);
        }
      } else {
        // Remove low power alert if power is restored
        state.alerts = state.alerts.filter(
          (alert) => alert.name !== "Low Power Generation"
        );
      }
    },
    handleAsteroidImpacts: (
      state,
      action: PayloadAction<{ asteroids: Asteroid[] }>
    ) => {
      const { asteroids } = action.payload;
      const currentGameSeconds =
        state.gameClock.minutes * 60 + state.gameClock.seconds;

      // Check each asteroid for impact
      asteroids.forEach((asteroid: Asteroid) => {
        const asteroidImpactSeconds =
          asteroid.impactAt.minutes * 60 + asteroid.impactAt.seconds;
        if (asteroidImpactSeconds <= currentGameSeconds) {
          // Asteroid has impacted - calculate damage
          const damage = 5 + asteroid.layers.length;
          state.hullDamage.current = Math.min(
            state.hullDamage.max,
            state.hullDamage.current + damage
          );
        }
      });
    },
    addAlert: (state, action: PayloadAction<Alert>) => {
      state.alerts.push(action.payload);
    },
    removeAlert: (state, action: PayloadAction<string>) => {
      state.alerts = state.alerts.filter(
        (alert) => alert.id !== action.payload
      );
    },
    setAutomaticAlerts: (state, action: PayloadAction<Alert[]>) => {
      // Remove existing automatic alerts and add new ones
      state.alerts = state.alerts.filter((alert) => alert.type !== "automatic");
      state.alerts.push(...action.payload);
    },
    updateSystemValue: (
      state,
      action: PayloadAction<{
        system: keyof ShipState;
        value: number;
        isCurrentValue?: boolean;
      }>
    ) => {
      const { system, value, isCurrentValue = true } = action.payload;
      const systemValue = state[system];

      if (isGauge(systemValue)) {
        if (isCurrentValue) {
          systemValue.current = Math.max(
            0,
            Math.min(systemValue.max, systemValue.current + value)
          );
        } else {
          systemValue.max = Math.max(0, systemValue.max + value);
        }
      } else if (system === "navigationAlignment") {
        state.navigationAlignment = Math.max(
          0,
          Math.min(100, state.navigationAlignment + value)
        );
      }
    },
    resetShipState: () => initialState,
    startBreak: (state) => {
      state.isOnBreak = true;
    },
    resumeJourney: (state) => {
      state.isOnBreak = false;
    },
  },
});

// Helper function to calculate power restoration per second
const calculatePowerRestoration = (engineeringPenalty: number = 1, scienceCorrect: boolean = true): number => {
  const baselineRecovery = 5;

  // Start with baseline recovery
  let powerRestoration = baselineRecovery;

  // Apply science pulse frequency factor
  if (!scienceCorrect) {
    powerRestoration *= 0.7; // Reduce by 30% if pulse frequency is incorrect
  }

  // Apply engineering penalty
  powerRestoration /= engineeringPenalty;

  return Math.max(0, Math.round(powerRestoration));
};

export const {
  advanceTime,
  gameTick,
  handleAsteroidImpacts,
  addAlert,
  removeAlert,
  setAutomaticAlerts,
  updateSystemValue,
  resetShipState,
  startBreak,
  resumeJourney,
} = shipSlice.actions;
export default shipSlice.reducer;
