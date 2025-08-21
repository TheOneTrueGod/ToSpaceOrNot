import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { GameState, Player } from '../types';

const initialState: GameState = {
  currentPlayer: null,
  currentPage: 'home'
};

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    setCurrentPlayer: (state, action: PayloadAction<Player>) => {
      state.currentPlayer = action.payload;
    },
    setCurrentPage: (state, action: PayloadAction<string>) => {
      state.currentPage = action.payload;
    }
  }
});

export const { setCurrentPlayer, setCurrentPage } = gameSlice.actions;
export default gameSlice.reducer;