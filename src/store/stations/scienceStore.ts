import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Quadrant, getQuadrant, Players } from '../../types';

export type FuelType = 'Hydrogen' | 'Xenon' | 'Plutonium' | 'Helium';

export const FUEL_COLORS: Record<FuelType, string> = {
	Hydrogen: '#3b82f6',
	Xenon: '#a855f7',
	Plutonium: '#10b981',
	Helium: '#f59e0b'
};

export interface TestTube {
	layers: FuelType[];
}

export interface ScienceState {
	pulseFrequency: {
		correct: number;
		current: number;
	};
	lastClickTimestamps: number[];
	fuelMixture: {
		storageTubes: TestTube[];
		activeTube: TestTube;
		correctMixture: {
			ownShip: FuelType[];
			otherShip: FuelType[];
		};
		previousCorrectMixture: {  // Store the previous correct mixture for forgiveness
			ownShip: FuelType[];
			otherShip: FuelType[];
		};
		lastChangeTime: number; // in game seconds
		changeCount: number;
		refuelCooldownUntil: number;
		dumpCooldownUntil: number;
		dumpAllCooldownUntil: number; // New cooldown for dump all
	};
	randomSeeds: {
		ownShip: number;
		otherShip: number;
	};
}

const FUEL_TYPES: FuelType[] = ['Hydrogen', 'Xenon', 'Plutonium', 'Helium'];
const CORRECT_PULSE_FREQUENCY = 1000;
const PULSE_FREQUENCY_TOLERANCE = 100;
export const FUEL_ADDED_PER_CORRECT_MIXTURE = 100;
export const REFUEL_COOLDOWN_NO_PENALTY_SECONDS = 10
export const REFUEL_COOLDOWN_SECONDS = 20;

export const FUEL_TARGET_TIMEOUT = 30

export const DUMP_COOLDOWN_NO_PENALTY_SECONDS = 2
export const DUMP_COOLDOWN_SECONDS = 3;

export const DUMP_ALL_COOLDOWN_NO_PENALTY_SECONDS = 20;
export const DUMP_ALL_COOLDOWN_SECONDS = 20;

export const PULSE_FREQUENCY_ENABLED = false;

// Get the required mixture length based on quadrant
export const getMixtureLength = (distanceTraveled: number): number => {
	const quadrant = getQuadrant(distanceTraveled - 1);
	console.log("getMixtureLength.  quadrant: ", quadrant)
	switch (quadrant) {
		case Quadrant.Alpha:
			return 3; // Easy mode in Alpha Quadrant
		case Quadrant.Beta:
		case Quadrant.Gamma:
			return 4; // Medium difficulty in Beta/Gamma
		case Quadrant.Delta:
			return 5; // Hard mode in Delta Quadrant
		default:
			return 3;
	}
};

// Helper function to calculate actual cooldown with engineering penalty
// This is now a pure function that takes the penalty as a parameter
export const getFuelCooldowns = (fuelPenalty: number = 1): { 'refuel': number, 'dump': number, 'dumpAll': number } => {
	const adjustedRefuelCooldown = fuelPenalty > 1 ? Math.round(REFUEL_COOLDOWN_NO_PENALTY_SECONDS * fuelPenalty) : REFUEL_COOLDOWN_SECONDS;
	const adjustedDumpCooldown = fuelPenalty > 1 ? Math.round(DUMP_COOLDOWN_NO_PENALTY_SECONDS * fuelPenalty) : DUMP_COOLDOWN_SECONDS;
	const adjustedDumpAllCooldown = fuelPenalty > 1 ? Math.round(DUMP_ALL_COOLDOWN_NO_PENALTY_SECONDS * fuelPenalty) : DUMP_ALL_COOLDOWN_SECONDS;

	const fuelValues =  { 'refuel': adjustedRefuelCooldown, 'dump': adjustedDumpCooldown, 'dumpAll': adjustedDumpAllCooldown }
	return fuelValues;
};

class SeededRandom {
	private seed: number;

	constructor(seed: number) {
		this.seed = seed;
	}

	next(): number {
		this.seed = (this.seed * 9301 + 49297) % 233280;
		return this.seed / 233280;
	}

	nextInt(min: number, max: number): number {
		return Math.floor(this.next() * (max - min + 1)) + min;
	}

	nextFuelType(): FuelType {
		return FUEL_TYPES[this.nextInt(0, FUEL_TYPES.length - 1)];
	}
}

const generateFuelMixture = (seed: number, length: number = 5): FuelType[] => {
	const rng = new SeededRandom(seed);
	const mixture: FuelType[] = [];
	for (let i = 0; i < length; i++) {
		mixture.push(rng.nextFuelType());
	}
	return mixture;
};

const generateStorageTubes = (): TestTube[] => {
	const tubes: TestTube[] = [];
	for (let i = 0; i < 4; i++) {
		const layers: FuelType[] = [];
		for (let j = 0; j < 5; j++) {
			layers.push(FUEL_TYPES[Math.floor(Math.random() * FUEL_TYPES.length)]);
		}
		tubes.push({ layers });
	}
	return tubes;
};

const initialState: ScienceState = {
	pulseFrequency: {
		correct: CORRECT_PULSE_FREQUENCY,
		current: CORRECT_PULSE_FREQUENCY
	},
	lastClickTimestamps: [],
	fuelMixture: {
		storageTubes: generateStorageTubes(),
		activeTube: { layers: [] },
		correctMixture: {
			ownShip: generateFuelMixture(12345, 3), // Start with Alpha quadrant length
			otherShip: generateFuelMixture(67890, 3)
		},
		previousCorrectMixture: {
			ownShip: generateFuelMixture(12345, 3), // Initially same as current
			otherShip: generateFuelMixture(67890, 3)
		},
		lastChangeTime: 0,
		changeCount: 0,
		refuelCooldownUntil: 0,
		dumpCooldownUntil: 0,
		dumpAllCooldownUntil: 0
	},
	randomSeeds: {
		ownShip: 12345,
		otherShip: 67890
	}
};

export const scienceSlice = createSlice({
	name: 'science',
	initialState,
	reducers: {
		recordPulseClick: (state, action: PayloadAction<number>) => {
			const timestamp = action.payload;
			state.lastClickTimestamps.push(timestamp);

			if (state.lastClickTimestamps.length > 4) {
				state.lastClickTimestamps.shift();
			}

			if (state.lastClickTimestamps.length >= 2) {
				const intervals: number[] = [];
				for (let i = 1; i < state.lastClickTimestamps.length; i++) {
					intervals.push(state.lastClickTimestamps[i] - state.lastClickTimestamps[i - 1]);
				}
				const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
				state.pulseFrequency.current = Math.round(avgInterval);
			}
		},

		transferFuel: (state, action: PayloadAction<{ tubeIndex: number, maxLayers: number }>) => {
			const { tubeIndex, maxLayers } = action.payload;
			if (tubeIndex < 0 || tubeIndex >= state.fuelMixture.storageTubes.length) return;

			const tube = state.fuelMixture.storageTubes[tubeIndex];
			if (tube.layers.length === 0) return;
			if (state.fuelMixture.activeTube.layers.length >= maxLayers) return;

			const fuel = tube.layers.pop()!;
			state.fuelMixture.activeTube.layers.push(fuel);
		},

		dumpTopLayer: (state, action: PayloadAction<{ currentGameSeconds: number; fuelPenalty?: number }>) => {
			const { currentGameSeconds, fuelPenalty = 1 } = action.payload;
			if (currentGameSeconds < state.fuelMixture.dumpCooldownUntil) return;
			if (state.fuelMixture.activeTube.layers.length === 0) return;

			// Remove the top layer (last element in the array)
			state.fuelMixture.activeTube.layers.pop();
			const { dump: cooldownDuration } = getFuelCooldowns(fuelPenalty);
			state.fuelMixture.dumpCooldownUntil = currentGameSeconds + cooldownDuration;
		},

		dumpAllLayers: (state, action: PayloadAction<{ currentGameSeconds: number; fuelPenalty?: number }>) => {
			const { currentGameSeconds, fuelPenalty = 1 } = action.payload;
			if (currentGameSeconds < state.fuelMixture.dumpAllCooldownUntil) return;
			if (state.fuelMixture.activeTube.layers.length === 0) return;

			// Remove all layers
			state.fuelMixture.activeTube.layers = [];
			const { dumpAll: cooldownDuration } = getFuelCooldowns(fuelPenalty);
			state.fuelMixture.dumpAllCooldownUntil = currentGameSeconds + cooldownDuration;
		},

		checkAndProcessCorrectMixture: (state, action: PayloadAction<{ currentPlayer: typeof Players.PLAYER_ONE | typeof Players.PLAYER_TWO, currentGameSeconds: number, requiredLength: number }>) => {
			const { currentPlayer, requiredLength } = action.payload;

			// Get both current and previous target mixtures
			const currentTargetMixture = currentPlayer === Players.PLAYER_ONE
				? state.fuelMixture.correctMixture.ownShip
				: state.fuelMixture.correctMixture.otherShip;

			const previousTargetMixture = currentPlayer === Players.PLAYER_ONE
				? state.fuelMixture.previousCorrectMixture.ownShip
				: state.fuelMixture.previousCorrectMixture.otherShip;

			const activeLayers = state.fuelMixture.activeTube.layers;
			if (activeLayers.length !== requiredLength) return;

			// Check if it matches either current or previous mixture (more forgiving)
			const matchesCurrent = activeLayers.every((fuel, index) => fuel === currentTargetMixture[index]);
			const matchesPrevious = activeLayers.every((fuel, index) => fuel === previousTargetMixture[index]);

			if (matchesCurrent || matchesPrevious) {
				state.fuelMixture.activeTube.layers = [];
			}
		},

		startRefuel: (state, action: PayloadAction<{ currentGameSeconds: number; fuelPenalty?: number }>) => {
			const { currentGameSeconds, fuelPenalty = 1 } = action.payload;
			if (currentGameSeconds < state.fuelMixture.refuelCooldownUntil) return;

			// Empty all storage tubes immediately
			state.fuelMixture.storageTubes = [
				{ layers: [] },
				{ layers: [] },
				{ layers: [] },
				{ layers: [] }
			];
			const { refuel: cooldownDuration } = getFuelCooldowns(fuelPenalty);
			state.fuelMixture.refuelCooldownUntil = currentGameSeconds + cooldownDuration;
		},

		completeRefuel: (state) => {
			// Refill the storage tubes after cooldown
			state.fuelMixture.storageTubes = generateStorageTubes();
		},

		updateCorrectMixtures: (state, action: PayloadAction<{ currentGameSeconds: number, mixtureLength: number }>) => {
			const { mixtureLength } = action.payload;

			// Use Unix timestamp rounded to nearest 20 seconds
			const now = Date.now() / 1000; // Convert to seconds
			const currentPeriod = Math.floor(now / FUEL_TARGET_TIMEOUT) * FUEL_TARGET_TIMEOUT; // Round down to nearest 20-second period
			const previousPeriod = currentPeriod - FUEL_TARGET_TIMEOUT;

			// Generate seeds based on the time periods
			const currentOwnShipSeed = 12345 + currentPeriod;
			const currentOtherShipSeed = 67890 + currentPeriod;
			const previousOwnShipSeed = 12345 + previousPeriod;
			const previousOtherShipSeed = 67890 + previousPeriod;

			// Generate current mixtures
			const newOwnShip = generateFuelMixture(currentOwnShipSeed, mixtureLength);
			const newOtherShip = generateFuelMixture(currentOtherShipSeed, mixtureLength);

			// Generate previous mixtures
			const prevOwnShip = generateFuelMixture(previousOwnShipSeed, mixtureLength);
			const prevOtherShip = generateFuelMixture(previousOtherShipSeed, mixtureLength);

			// Update state
			state.fuelMixture.correctMixture.ownShip = newOwnShip;
			state.fuelMixture.correctMixture.otherShip = newOtherShip;
			state.fuelMixture.previousCorrectMixture.ownShip = prevOwnShip;
			state.fuelMixture.previousCorrectMixture.otherShip = prevOtherShip;

			// Update tracking values
			state.fuelMixture.lastChangeTime = currentPeriod;
			state.fuelMixture.changeCount = Math.floor(currentPeriod / 20);
			state.randomSeeds.ownShip = currentOwnShipSeed;
			state.randomSeeds.otherShip = currentOtherShipSeed;
		},

		setPulseFrequency: (state, action: PayloadAction<{ correct?: number, current?: number }>) => {
			const { correct, current } = action.payload;
			if (correct !== undefined) state.pulseFrequency.correct = correct;
			if (current !== undefined) state.pulseFrequency.current = current;
		},

		setFuelMixture: (state, action: PayloadAction<Partial<ScienceState['fuelMixture']>>) => {
			state.fuelMixture = { ...state.fuelMixture, ...action.payload };
		}
	}
});

export const {
	recordPulseClick,
	transferFuel,
	dumpTopLayer,
	dumpAllLayers,
	checkAndProcessCorrectMixture,
	startRefuel,
	completeRefuel,
	updateCorrectMixtures,
	setPulseFrequency,
	setFuelMixture
} = scienceSlice.actions;

export const isPulseFrequencyCorrect = (state: ScienceState): boolean => {
	const diff = Math.abs(state.pulseFrequency.current - state.pulseFrequency.correct);
	return diff <= PULSE_FREQUENCY_TOLERANCE;
};

export default scienceSlice.reducer;