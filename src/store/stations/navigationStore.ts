import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface NavigationState {
  correct: {
    pitch: number;
    yaw: number;
    roll: number;
  };
  current: {
    pitch: number;
    yaw: number;
    roll: number;
  };
}

// Hardcoded correct navigation values
const CORRECT_NAVIGATION = {
  pitch: 15.5,
  yaw: 270.0,
  roll: 0.0
};

const initialState: NavigationState = {
  correct: CORRECT_NAVIGATION,
  current: { ...CORRECT_NAVIGATION } // Initialize current to match correct
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
    resetNavigation: (state) => {
      state.current = { ...state.correct };
    }
  }
});

export const { updateNavigationValue, resetNavigation } = navigationSlice.actions;
export default navigationSlice.reducer;
