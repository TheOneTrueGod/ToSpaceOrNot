import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { StationType } from '../types';
import { EngineeringState, EngineeringPanels, generateEngineeringState } from './stations/engineeringStore';

interface StationStore {
	activeStation: StationType;
	stationStates: {
		Engineering: EngineeringState;
		Navigation: unknown;
		Weapons: unknown;
		Science: unknown;
	};
}

const initialState: StationStore = {
	activeStation: 'Main Screen',
	stationStates: {
		Engineering: generateEngineeringState(),
		Navigation: { course: 0, autopilot: false },
		Weapons: { armed: false, targeting: false },
		Science: { scanning: false, analysis: 0 }
	}
};

const stationSlice = createSlice({
	name: 'station',
	initialState,
	reducers: {
		setActiveStation: (state, action: PayloadAction<StationType>) => {
			state.activeStation = action.payload;
		},
		updateEngineeringState: (state, action: PayloadAction<{ newState: EngineeringPanels }>) => {
			state.stationStates['Engineering'] = {
				...state.stationStates['Engineering'],
				panels: action.payload.newState
			}
		},
		/*updateStationState: (state, action: PayloadAction<{
			station: StationType;
			updates: any;
		}>) => {
			const { station, updates } = action.payload;
			state.stationStates[station] = { ...state.stationStates[station], ...updates };
		}*/
	}
});

export const { setActiveStation, updateEngineeringState } = stationSlice.actions;
export default stationSlice.reducer;