import { configureStore } from '@reduxjs/toolkit';
import shipReducer from './shipStore';
import gameReducer from './gameStore';
import stationReducer from './stationStore';

export const store = configureStore({
  reducer: {
    ship: shipReducer,
    game: gameReducer,
    station: stationReducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;