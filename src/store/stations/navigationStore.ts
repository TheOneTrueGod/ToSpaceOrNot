import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Quadrant, getQuadrant, Players } from "../../types";

export interface NavigationValues {
  pitch: number;
  yaw: number;
  roll: number;
}

export interface NavigationState {
  correctValues: {
    albatross: NavigationValues;
    kestrel: NavigationValues;
  };
  current: NavigationValues;
}

// Navigation values for each quadrant
const NAVIGATION_VALUES_BY_QUADRANT = {
  // Alpha Quadrant: 0-250km traveled
  [Quadrant.Alpha]: {
    albatross: { pitch: 15.5, yaw: 270.0, roll: 0.0 },
    kestrel: { pitch: 12.3, yaw: 275.5, roll: -2.1 },
  },
  // Beta Quadrant: 250-500km traveled
  [Quadrant.Beta]: {
    albatross: { pitch: 18.7, yaw: 265.2, roll: 1.5 },
    kestrel: { pitch: 16.1, yaw: 272.8, roll: -0.9 },
  },
  // Gamma Quadrant: 500-750km traveled
  [Quadrant.Gamma]: {
    albatross: { pitch: 14.2, yaw: 278.3, roll: -1.2 },
    kestrel: { pitch: 19.8, yaw: 268.7, roll: 2.3 },
  },
  // Delta Quadrant: 750-1000km traveled
  [Quadrant.Delta]: {
    albatross: { pitch: 17.6, yaw: 263.9, roll: 0.8 },
    kestrel: { pitch: 13.4, yaw: 281.2, roll: -1.7 },
  },
} as const;

// Helper function to get current stage number based on quadrant (for backward compatibility)
export const getCurrentNavigationStage = (distanceTraveled: number): number => {
	// Offset by 1 so that we view the next quadrant's values when we're on a break
  const quadrant = getQuadrant(distanceTraveled + 1);
  const quadrantToStage = {
    [Quadrant.Alpha]: 0,
    [Quadrant.Beta]: 1,
    [Quadrant.Gamma]: 2,
    [Quadrant.Delta]: 3,
  };
  return quadrantToStage[quadrant];
};

// Helper function to get correct navigation values for current quadrant
export const getNavigationValuesForQuadrant = (quadrant: Quadrant) => {
  return NAVIGATION_VALUES_BY_QUADRANT[quadrant];
};

// Helper function to get correct navigation values for stage (for backward compatibility)
export const getNavigationValuesForStage = (stage: number) => {
  const stageToQuadrant = [Quadrant.Alpha, Quadrant.Beta, Quadrant.Gamma, Quadrant.Delta];
  const quadrant = stageToQuadrant[stage] || Quadrant.Alpha;
  return getNavigationValuesForQuadrant(quadrant);
};

const initialState: NavigationState = {
  correctValues: NAVIGATION_VALUES_BY_QUADRANT[Quadrant.Alpha],
  current: { pitch: 0, yaw: 0, roll: 0 }, // Initialize to neutral values, will be set when player selects
};

export const navigationSlice = createSlice({
  name: "navigation",
  initialState,
  reducers: {
    updateNavigationValue: (
      state,
      action: PayloadAction<{
        axis: "pitch" | "yaw" | "roll";
        value: number;
        relative: boolean;
      }>
    ) => {
      const { axis, value, relative } = action.payload;
      if (relative) {
        state.current[axis] += value;
      } else {
        state.current[axis] = value;
      }
    },
    resetNavigation: (
      state,
      action: PayloadAction<{ player?: typeof Players.PLAYER_ONE | typeof Players.PLAYER_TWO }>
    ) => {
      const player = action.payload?.player || Players.PLAYER_ONE;
      state.current =
        player === Players.PLAYER_ONE
          ? { ...state.correctValues.albatross }
          : { ...state.correctValues.kestrel };
    },
    updateNavigationStage: (
      state,
      action: PayloadAction<{ stage: number }>
    ) => {
      const { stage } = action.payload;
      state.correctValues = getNavigationValuesForStage(stage);
    },
  },
});

export const { updateNavigationValue, resetNavigation, updateNavigationStage } =
  navigationSlice.actions;
export default navigationSlice.reducer;
