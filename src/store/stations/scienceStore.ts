import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { store } from '../index';
import { getFuelPenaltyMultiplier } from './engineeringStore';

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
    lastChangeTime: number; // in game seconds
    changeCount: number;
    refuelCooldownUntil: number;
    dumpCooldownUntil: number;
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
export const REFUEL_COOLDOWN_SECONDS = 20;
export const DUMP_COOLDOWN_SECONDS = 5;

// Helper function to calculate actual cooldown with engineering penalty
const calculateCooldownWithPenalty = (baseCooldown: number): number => {
  try {
    const currentState = store.getState();
    const engineeringState = currentState.engineering;
    const currentPlayer = currentState.game?.currentPlayer || 'Gobi';
    
    if (engineeringState) {
      const fuelPenalty = getFuelPenaltyMultiplier(engineeringState, currentPlayer);
      return Math.round(baseCooldown * fuelPenalty);
    }
    
    return baseCooldown;
  } catch (error) {
    // Fallback to base cooldown if there are any issues accessing state
    return baseCooldown;
  }
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

const generateFuelMixture = (seed: number): FuelType[] => {
  const rng = new SeededRandom(seed);
  const mixture: FuelType[] = [];
  for (let i = 0; i < 5; i++) {
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
      ownShip: generateFuelMixture(12345),
      otherShip: generateFuelMixture(67890)
    },
    lastChangeTime: 0,
    changeCount: 0,
    refuelCooldownUntil: 0,
    dumpCooldownUntil: 0
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
    
    transferFuel: (state, action: PayloadAction<number>) => {
      const tubeIndex = action.payload;
      if (tubeIndex < 0 || tubeIndex >= state.fuelMixture.storageTubes.length) return;
      
      const tube = state.fuelMixture.storageTubes[tubeIndex];
      if (tube.layers.length === 0) return;
      if (state.fuelMixture.activeTube.layers.length >= 5) return;
      
      const fuel = tube.layers.pop()!;
      state.fuelMixture.activeTube.layers.push(fuel);
    },
    
    dumpTopLayer: (state, action: PayloadAction<number>) => {
      const currentGameSeconds = action.payload;
      if (currentGameSeconds < state.fuelMixture.dumpCooldownUntil) return;
      if (state.fuelMixture.activeTube.layers.length === 0) return;
      
      // Remove the top layer (last element in the array)
      state.fuelMixture.activeTube.layers.pop();
      const cooldownDuration = calculateCooldownWithPenalty(DUMP_COOLDOWN_SECONDS);
      state.fuelMixture.dumpCooldownUntil = currentGameSeconds + cooldownDuration;
    },
    
    checkAndProcessCorrectMixture: (state, action: PayloadAction<{ currentPlayer: 'Gobi' | 'Ben', currentGameSeconds: number }>) => {
      const { currentPlayer } = action.payload;
      const targetMixture = currentPlayer === 'Gobi' 
        ? state.fuelMixture.correctMixture.ownShip 
        : state.fuelMixture.correctMixture.otherShip;
      
      const activeLayers = state.fuelMixture.activeTube.layers;
      if (activeLayers.length !== 5) return;
      
      const isCorrect = activeLayers.every((fuel, index) => fuel === targetMixture[index]);
      
      if (isCorrect) {
        state.fuelMixture.activeTube.layers = [];
      }
    },
    
    startRefuel: (state, action: PayloadAction<number>) => {
      const currentGameSeconds = action.payload;
      if (currentGameSeconds < state.fuelMixture.refuelCooldownUntil) return;
      
      // Empty all storage tubes immediately
      state.fuelMixture.storageTubes = [
        { layers: [] },
        { layers: [] },
        { layers: [] },
        { layers: [] }
      ];
      const cooldownDuration = calculateCooldownWithPenalty(REFUEL_COOLDOWN_SECONDS);
      state.fuelMixture.refuelCooldownUntil = currentGameSeconds + cooldownDuration;
    },
    
    completeRefuel: (state) => {
      // Refill the storage tubes after cooldown
      state.fuelMixture.storageTubes = generateStorageTubes();
    },
    
    updateCorrectMixtures: (state, action: PayloadAction<{ currentGameSeconds: number }>) => {
      const { currentGameSeconds } = action.payload;
      const timeSinceLastChange = currentGameSeconds - state.fuelMixture.lastChangeTime;
      
      // Change mixture every 20 seconds
      if (timeSinceLastChange >= 20) {
        const numChanges = Math.floor(timeSinceLastChange / 20);
        state.randomSeeds.ownShip += numChanges * 1000;
        state.randomSeeds.otherShip += numChanges * 1000;
        
        state.fuelMixture.correctMixture.ownShip = generateFuelMixture(state.randomSeeds.ownShip);
        state.fuelMixture.correctMixture.otherShip = generateFuelMixture(state.randomSeeds.otherShip);
        
        state.fuelMixture.lastChangeTime = currentGameSeconds - (currentGameSeconds % 20);
        state.fuelMixture.changeCount += numChanges;
      }
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