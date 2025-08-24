import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface WireConnection {
  from: { type: "input" | "node" | "output"; index: number };
  to: { type: "input" | "node" | "output"; index: number };
}

interface PanelState {
  connections: WireConnection[];
}

export interface EngineeringPanels {
  [panelName: string]: PanelState;
}

export interface EngineeringState {
  panels: EngineeringPanels;
  correctState: {
    Gobi: {
      [panelName: string]: PanelState;
    };
    Ben: {
      [panelName: string]: PanelState;
    };
  };
  panelOrder: string[];
  isViewingSchematic: boolean;
}

const POTENTIAL_PANEL_NAMES = ["A1b2", "Xy9Z", "3Fp7", "Q8wS"];

// Different permutations for Gobi
const GOBI_INPUT_PERMUTATIONS: number[][] = [
  [1, 0, 3, 2],
  [2, 3, 1, 0],
  [3, 2, 0, 1],
  [0, 2, 1, 3],
  [1, 3, 0, 2],
  [2, 0, 3, 1],
];
const GOBI_OUTPUT_PERMUTATIONS: number[][] = [
  [0, 1, 2, 3],
  [1, 2, 3, 0],
  [2, 3, 0, 1],
  [3, 0, 1, 2],
  [0, 2, 1, 3],
  [1, 0, 3, 2],
];

// Different permutations for Ben
const BEN_INPUT_PERMUTATIONS: number[][] = [
  [3, 1, 0, 2],
  [0, 3, 2, 1],
  [2, 0, 1, 3],
  [1, 2, 3, 0],
  [3, 0, 2, 1],
  [1, 3, 2, 0],
];
const BEN_OUTPUT_PERMUTATIONS: number[][] = [
  [2, 0, 3, 1],
  [3, 1, 2, 0],
  [1, 3, 0, 2],
  [0, 3, 1, 2],
  [2, 1, 0, 3],
  [3, 2, 1, 0],
];
const pickRandomUnique = (names: string[], count: number): string[] => {
  // Fisher-Yates shuffle to ensure unbiased random order
  const shuffled = [...names];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
};

export const PANEL_NAMES = pickRandomUnique(POTENTIAL_PANEL_NAMES, 4);

export const generatePanelState = (
  panelId: string,
  player: "Gobi" | "Ben"
): PanelState["connections"] => {
  const connections: WireConnection[] = [];

  const nameIndex = POTENTIAL_PANEL_NAMES.indexOf(panelId);

  // Select permutations based on player
  const inputPermutations =
    player === "Gobi" ? GOBI_INPUT_PERMUTATIONS : BEN_INPUT_PERMUTATIONS;
  const outputPermutations =
    player === "Gobi" ? GOBI_OUTPUT_PERMUTATIONS : BEN_OUTPUT_PERMUTATIONS;

  const inputPermutation =
    inputPermutations[
      (nameIndex >= 0 ? nameIndex : 0) % inputPermutations.length
    ];
  const outputPermutation =
    outputPermutations[
      (nameIndex >= 0 ? nameIndex : 0) % outputPermutations.length
    ];

  for (let i = 0; i < 4; i++) {
    connections.push({
      from: { type: "input", index: i },
      to: { type: "node", index: inputPermutation[i] },
    });

    connections.push({
      from: { type: "node", index: i },
      to: { type: "output", index: outputPermutation[i] },
    });
  }
  return connections;
};

// Debug mode flag
export const DEBUG_MODE = false;

// Panel to system mapping - hardcoded for consistency across games
export const PANEL_SYSTEM_MAPPING: { [panelName: string]: string } = {
  A1b2: "Weapons",
  Xy9Z: "Thrust",
  "3Fp7": "Fuel",
  Q8wS: "Power",
};

// Penalty thresholds and multipliers
export const PENALTY_CONFIG = {
  LIGHT_THRESHOLD: 1,
  MEDIUM_THRESHOLD: 3,
  HEAVY_THRESHOLD: 5,
  LIGHT_MULTIPLIER: 1.5,
  MEDIUM_MULTIPLIER: 2,
  HEAVY_MULTIPLIER: 3,
};

export const generateEngineeringState = (
  currentPlayer?: "Gobi" | "Ben"
): EngineeringState => {
  // Generate different correct states for each player
  const gobiCorrectState: { [key: string]: PanelState } = {};
  const benCorrectState: { [key: string]: PanelState } = {};

  PANEL_NAMES.forEach((panelName) => {
    gobiCorrectState[panelName] = {
      connections: generatePanelState(panelName, "Gobi"),
    };
    benCorrectState[panelName] = {
      connections: generatePanelState(panelName, "Ben"),
    };
  });

  // Initialize panels to match the current player's correct state
  // If no player specified (initial load), default to Gobi's state
  const panels: { [key: string]: PanelState } = {};
  const playerToUse = currentPlayer || "Gobi";
  const correctStateToUse =
    playerToUse === "Gobi" ? gobiCorrectState : benCorrectState;

  PANEL_NAMES.forEach((panelName) => {
    // Deep copy the correct state for this player
    panels[panelName] = {
      connections: [...correctStateToUse[panelName].connections],
    };
  });

  return {
    panels,
    correctState: {
      Gobi: gobiCorrectState,
      Ben: benCorrectState,
    },
    panelOrder: [...PANEL_NAMES].sort(() => Math.random() - 0.5),
    isViewingSchematic: false,
  };
};

// Calculate the number of incorrect connections for a panel
export const countIncorrectConnections = (
  currentConnections: WireConnection[],
  correctConnections: WireConnection[]
): number => {
  let incorrectCount = 0;

  // Check each correct connection to see if it exists in current connections
  correctConnections.forEach((correctConn) => {
    const hasCorrectConnection = currentConnections.some(
      (currentConn) =>
        currentConn.from.type === correctConn.from.type &&
        currentConn.from.index === correctConn.from.index &&
        currentConn.to.type === correctConn.to.type &&
        currentConn.to.index === correctConn.to.index
    );

    if (!hasCorrectConnection) {
      incorrectCount++;
    }
  });

  return incorrectCount;
};

// Get penalty level based on incorrect connection count
export const getPenaltyLevel = (
  incorrectCount: number
): "none" | "light" | "medium" | "heavy" => {
  if (incorrectCount === 0) return "none";
  if (incorrectCount < PENALTY_CONFIG.MEDIUM_THRESHOLD) return "light";
  if (incorrectCount < PENALTY_CONFIG.HEAVY_THRESHOLD) return "medium";
  return "heavy";
};

// Get penalty multiplier for a given system and panel
export const getPenaltyMultiplier = (
  panelName: string,
  engineeringState: EngineeringState,
  currentPlayer: "Gobi" | "Ben"
): number => {
  const currentPanel = engineeringState.panels[panelName];
  const correctPanel = engineeringState.correctState[currentPlayer][panelName];

  if (!currentPanel || !correctPanel) return 1;

  const incorrectCount = countIncorrectConnections(
    currentPanel.connections,
    correctPanel.connections
  );

  const penaltyLevel = getPenaltyLevel(incorrectCount);

  switch (penaltyLevel) {
    case "light":
      return PENALTY_CONFIG.LIGHT_MULTIPLIER;
    case "medium":
      return PENALTY_CONFIG.MEDIUM_MULTIPLIER;
    case "heavy":
      return PENALTY_CONFIG.HEAVY_MULTIPLIER;
    default:
      return 1;
  }
};

// Get penalty multiplier for specific systems
export const getPowerPenaltyMultiplier = (
  engineeringState: EngineeringState,
  currentPlayer: "Gobi" | "Ben"
): number => {
  const powerPanel = Object.keys(PANEL_SYSTEM_MAPPING).find(
    (key) => PANEL_SYSTEM_MAPPING[key] === "Power"
  );
  return powerPanel
    ? getPenaltyMultiplier(powerPanel, engineeringState, currentPlayer)
    : 1;
};

export const getThrustPenaltyMultiplier = (
  engineeringState: EngineeringState,
  currentPlayer: "Gobi" | "Ben"
): number => {
  const thrustPanel = Object.keys(PANEL_SYSTEM_MAPPING).find(
    (key) => PANEL_SYSTEM_MAPPING[key] === "Thrust"
  );
  return thrustPanel
    ? getPenaltyMultiplier(thrustPanel, engineeringState, currentPlayer)
    : 1;
};

export const getFuelPenaltyMultiplier = (
  engineeringState: EngineeringState,
  currentPlayer: "Gobi" | "Ben"
): number => {
  const fuelPanel = Object.keys(PANEL_SYSTEM_MAPPING).find(
    (key) => PANEL_SYSTEM_MAPPING[key] === "Fuel"
  );
  return fuelPanel
    ? getPenaltyMultiplier(fuelPanel, engineeringState, currentPlayer)
    : 1;
};

export const getWeaponsPenaltyMultiplier = (
  engineeringState: EngineeringState,
  currentPlayer: "Gobi" | "Ben"
): number => {
  const weaponsPanel = Object.keys(PANEL_SYSTEM_MAPPING).find(
    (key) => PANEL_SYSTEM_MAPPING[key] === "Weapons"
  );
  return weaponsPanel
    ? getPenaltyMultiplier(weaponsPanel, engineeringState, currentPlayer)
    : 1;
};

const initialState: EngineeringState = generateEngineeringState();

export const engineeringSlice = createSlice({
  name: "engineering",
  initialState,
  reducers: {
    updatePanelConnections: (
      state,
      action: PayloadAction<{
        panelName: string;
        connections: WireConnection[];
      }>
    ) => {
      const { panelName, connections } = action.payload;
      if (state.panels[panelName]) {
        state.panels[panelName].connections = connections;
      }
    },
    resetEngineering: (
      state,
      action: PayloadAction<{ player?: "Gobi" | "Ben" } | undefined>
    ) => {
      const player = action?.payload?.player;
      const newState = generateEngineeringState(player);
      state.panels = newState.panels;
      state.correctState = newState.correctState;
      state.panelOrder = newState.panelOrder;
      state.isViewingSchematic = false;
    },
    toggleSchematicView: (state) => {
      state.isViewingSchematic = !state.isViewingSchematic;
    },
    initializeForPlayer: (state, action: PayloadAction<"Gobi" | "Ben">) => {
      const player = action.payload;
      // Set panels to match the correct state for this player
      PANEL_NAMES.forEach((panelName) => {
        if (state.correctState[player][panelName]) {
          state.panels[panelName] = {
            connections: [...state.correctState[player][panelName].connections],
          };
        }
      });
      state.isViewingSchematic = false;
    },
  },
});

export const {
  updatePanelConnections,
  resetEngineering,
  toggleSchematicView,
  initializeForPlayer,
} = engineeringSlice.actions;
export default engineeringSlice.reducer;
