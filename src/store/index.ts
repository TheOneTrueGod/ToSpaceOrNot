import { configureStore } from '@reduxjs/toolkit';
import shipReducer from './shipStore';
import gameReducer from './gameStore';
import stationReducer from './stationStore';
import weaponsReducer from './stations/weaponsStore';
import navigationReducer from './stations/navigationStore';

export const store = configureStore({
  reducer: {
    ship: shipReducer,
    game: gameReducer,
    station: stationReducer,
    weapons: weaponsReducer,
    navigation: navigationReducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;