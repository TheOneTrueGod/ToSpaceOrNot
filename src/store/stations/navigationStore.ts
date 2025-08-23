import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface NavigationValues {
  pitch: number;
  yaw: number;
  roll: number;
}

export interface NavigationState {
  correctValues: {
    gobi: NavigationValues;
    ben: NavigationValues;
  };
  current: NavigationValues;
}

// Navigation values for each stage based on distance traveled (0-250, 250-500, 500-750, 750-1000)
// These are the break points: [250, 500, 750] meaning breaks at 250km, 500km, 750km traveled
const NAVIGATION_VALUES_BY_STAGE = {
  // Stage 0: 0-250km traveled
  0: {
    gobi: { pitch: 15.5, yaw: 270.0, roll: 0.0 },
    ben: { pitch: 12.3, yaw: 275.5, roll: -2.1 }
  },
  // Stage 1: 250-500km traveled  
  1: {
    gobi: { pitch: 18.7, yaw: 265.2, roll: 1.5 },
    ben: { pitch: 16.1, yaw: 272.8, roll: -0.9 }
  },
  // Stage 2: 500-750km traveled
  2: {
    gobi: { pitch: 14.2, yaw: 278.3, roll: -1.2 },
    ben: { pitch: 19.8, yaw: 268.7, roll: 2.3 }
  },
  // Stage 3: 750-1000km traveled
  3: {
    gobi: { pitch: 17.6, yaw: 263.9, roll: 0.8 },
    ben: { pitch: 13.4, yaw: 281.2, roll: -1.7 }
  }
} as const;

// Helper function to get current stage based on distance traveled
export const getCurrentNavigationStage = (distanceTraveled: number): number => {
  if (distanceTraveled < 250) return 0;
  if (distanceTraveled < 500) return 1;
  if (distanceTraveled < 750) return 2;
  return 3;
};

// Helper function to get correct navigation values for current stage
export const getNavigationValuesForStage = (stage: number) => {
  return NAVIGATION_VALUES_BY_STAGE[stage as keyof typeof NAVIGATION_VALUES_BY_STAGE] || NAVIGATION_VALUES_BY_STAGE[0];
};

const initialState: NavigationState = {
  correctValues: NAVIGATION_VALUES_BY_STAGE[0],
  current: { pitch: 0, yaw: 0, roll: 0 } // Initialize to neutral values, will be set when player selects
};

export const navigationSlice = createSlice({
  name: 'navigation',
  initialState,
  reducers: {
    updateNavigationValue: (
      state,
      action: PayloadAction<{ axis: 'pitch' | 'yaw' | 'roll'; value: number }>
    ) => {
      const { axis, value } = action.payload;
      state.current[axis] = value;
    },
    resetNavigation: (
      state,
      action: PayloadAction<{ player?: 'Gobi' | 'Ben' }>
    ) => {
      const player = action.payload?.player || 'Gobi';
      state.current = player === 'Gobi' 
        ? { ...state.correctValues.gobi }
        : { ...state.correctValues.ben };
    },
    updateNavigationStage: (
      state,
      action: PayloadAction<{ stage: number }>
    ) => {
      const { stage } = action.payload;
      state.correctValues = getNavigationValuesForStage(stage);
    }
  }
});

export const { updateNavigationValue, resetNavigation, updateNavigationStage } = navigationSlice.actions;
export default navigationSlice.reducer;
