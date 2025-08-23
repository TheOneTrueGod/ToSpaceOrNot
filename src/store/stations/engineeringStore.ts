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
    [panelName: string]: PanelState;
  };
  panelOrder: string[];
}

const POTENTIAL_PANEL_NAMES = ["A1b2", "Xy9Z", "3Fp7", "Q8wS"];
const INPUT_PERMUTATIONS: number[][] = [
  [1, 0, 3, 2],
  [2, 3, 1, 0],
  [3, 2, 0, 1],
  [0, 2, 1, 3],
  [1, 3, 0, 2],
  [2, 0, 3, 1],
];
const OUTPUT_PERMUTATIONS: number[][] = [
  [0, 1, 2, 3],
  [1, 2, 3, 0],
  [2, 3, 0, 1],
  [3, 0, 1, 2],
  [0, 2, 1, 3],
  [1, 0, 3, 2],
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
  panelId: string
): PanelState["connections"] => {
  const connections: WireConnection[] = [];

  const nameIndex = POTENTIAL_PANEL_NAMES.indexOf(panelId);
  const inputPermutation =
    INPUT_PERMUTATIONS[
      (nameIndex >= 0 ? nameIndex : 0) % INPUT_PERMUTATIONS.length
    ];
  const outputPermutation =
    OUTPUT_PERMUTATIONS[
      (nameIndex >= 0 ? nameIndex : 0) % OUTPUT_PERMUTATIONS.length
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

export const generateEngineeringState = (): EngineeringState => {
  const panels: { [key: string]: PanelState } = {};

  PANEL_NAMES.forEach((panelName) => {
    panels[panelName] = { connections: generatePanelState(panelName) };
  });

  return {
    panels,
    correctState: JSON.parse(JSON.stringify(panels)),
    panelOrder: [...PANEL_NAMES].sort(() => Math.random() - 0.5),
  };
};
