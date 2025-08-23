import { configureStore } from '@reduxjs/toolkit';
import shipReducer from './shipStore';
import gameReducer from './gameStore';
import stationReducer from './stationStore';
import weaponsReducer from './stations/weaponsStore';
import navigationReducer from './stations/navigationStore';
import scienceReducer from './stations/scienceStore';
import engineeringReducer from './stations/engineeringStore';

export const store = configureStore({
  reducer: {
    ship: shipReducer,
    game: gameReducer,
    station: stationReducer,
    weapons: weaponsReducer,
    navigation: navigationReducer,
    science: scienceReducer,
    engineering: engineeringReducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;