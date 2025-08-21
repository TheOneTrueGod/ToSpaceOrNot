
interface WireConnection {
  from: { type: 'input' | 'node' | 'output'; index: number };
  to: { type: 'input' | 'node' | 'output'; index: number };
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
	}
  panelOrder: string[];
}

const PANEL_NAMES = ['A1b2', 'Xy9Z', '3Fp7', 'Q8wS'];
const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b']; // red, blue, green, yellow

export const generatePanelState = (): PanelState['connections'] => {
	const connections: WireConnection[] = [];

	// Create a correct wiring pattern for each panel
	for (let i = 0; i < 4; i++) {
		// Connect input to node
		connections.push({
			from: { type: 'input', index: i },
			to: { type: 'node', index: i }
		});

		// Connect node to output (with some variation)
		connections.push({
			from: { type: 'node', index: i },
			to: { type: 'output', index: (i + 1) % 4 }
		});
	}
	return connections
}

export const generateEngineeringState = (): EngineeringState => {
	const panels: { [key: string]: PanelState } = {};

	PANEL_NAMES.forEach(panelName => {
		panels[panelName] = { connections: generatePanelState() };
	});

	return {
		panels,
		correctState: JSON.parse(JSON.stringify(panels)),
		panelOrder: [...PANEL_NAMES].sort(() => Math.random() - 0.5)
	};
};