import { store } from "../store";
import { Players } from "../types";
import { spawnAsteroid } from "../store/stations/weaponsStore";
import { updateSystemValue } from "../store/shipStore";
import {
  updatePanelConnections,
  RewireSource,
} from "../store/stations/engineeringStore";
import { updateNavigationValue } from "../store/stations/navigationStore";
import { disasterEventBus } from "./DisasterEventBus";
import { Quadrant, getQuadrant } from "../types";

export type DisasterSeverity = "minor" | "major" | "catastrophic";

export interface DisasterType {
  id: string;
  name: string;
  severity: DisasterSeverity;
  execute: () => void;
}

// Reusable event functions
export class DisasterEvents {
  // Spawn asteroids with specified parameters
  static spawnAsteroids(
    count: number,
    smallCount: number,
    mediumCount: number = 0,
    largeCount: number = 0,
    distanceMultiplier: number = 1
  ) {
    const state = store.getState();
    const gameClock = state.ship.gameClock;

    for (let i = 0; i < count; i++) {
      let layers: number;

      if (i < largeCount) {
        // Large asteroid: 3-5 layers
        layers = 3 + Math.floor(Math.random() * 3);
      } else if (i < largeCount + mediumCount) {
        // Medium asteroid: 2-4 layers
        layers = 2 + Math.floor(Math.random() * 3);
      } else {
        // Small asteroid: 1-2 layers
        layers = 1 + Math.floor(Math.random() * 2);
      }

      // Increase impact time by distance multiplier (asteroids spawn farther away)
      const baseImpactTime = 40 + Math.random() * 50; // 40-90 seconds
      const impactInSeconds = Math.round(baseImpactTime * distanceMultiplier);

      store.dispatch(
        spawnAsteroid({
          currentGameTime: gameClock,
          impactInSeconds,
          override: {
            initialLayerCount: layers,
          },
        })
      );
    }
  }

  // Nudge navigation value by amount
  static nudgeNavigation(amount: number) {
    const navigationValues = ["pitch", "yaw", "roll"] as const;
    const randomValue =
      navigationValues[Math.floor(Math.random() * navigationValues.length)];

    store.dispatch(
      updateNavigationValue({
        axis: randomValue,
        value: amount,
        relative: true,
      })
    );

    // Trigger slide animation for navigation misalignment
    disasterEventBus.triggerAnimation("slide");
  }

  // Reduce ship power
  static reducePower(amount: number) {
    store.dispatch(
      updateSystemValue({
        system: "batteryPower",
        value: -amount,
        isCurrentValue: true,
      })
    );
  }

  // Check if a panel can be rewired based on override rules
  static canRewirePanel(panel: { rewireSource?: RewireSource }, newSource: RewireSource): boolean {
    const currentSource = panel.rewireSource;

    // If panel has no rewire source (user fixed or never rewired), it can be rewired
    if (!currentSource) return true;

    // Define override hierarchy
    const hierarchy: Record<RewireSource, number> = {
      user: 0,
      minor: 1,
      major: 2,
      catastrophic: 3,
    };

    // Check override rules
    if (newSource === "minor") {
      // Minor cannot override any existing rewire
      return false;
    } else if (newSource === "major") {
      // Major can override minor only
      return hierarchy[currentSource] < hierarchy["major"];
    } else if (newSource === "catastrophic") {
      // Catastrophic can override minor and major, but not another catastrophic
      return hierarchy[currentSource] < hierarchy["catastrophic"];
    }

    return false;
  }

  // Cut exactly N cables from each available panel for the current player
  static cutCables(cablesPerPanel: number, source: RewireSource = "minor"): string[] {
    const state = store.getState();
    const engineering = state.engineering;
    const currentPlayer = state.game?.currentPlayer || Players.PLAYER_ONE;
    const affectedPanels: string[] = [];

    // Get all panels with connections that can be affected
    const panelsWithConnections = Object.keys(engineering.panels).filter((panel) => {
      const currentPanel = engineering.panels[panel];
      return currentPanel && currentPanel.connections.length > 0 && 
             DisasterEvents.canRewirePanel(currentPanel, source);
    });

    if (panelsWithConnections.length === 0) {
      console.log(`🛡️ No panels available for cable cutting - no connections to cut`);
      return [];
    }

    let totalCablesCut = 0;

    // Cut exactly cablesPerPanel cables from each panel
    panelsWithConnections.forEach(panelName => {
      const panel = engineering.panels[panelName];
      if (!panel || panel.connections.length === 0) return;

      // Determine how many cables to cut from this panel
      const cablesToCut = Math.min(cablesPerPanel, panel.connections.length);
      
      // Get random indices to cut
      const indicesToCut = [...Array(panel.connections.length).keys()]
        .sort(() => Math.random() - 0.5)
        .slice(0, cablesToCut)
        .sort((a, b) => b - a); // Sort descending to avoid index shifting issues

      // Cut the connections
      const newConnections = [...panel.connections];
      indicesToCut.forEach(index => {
        newConnections.splice(index, 1);
      });

      store.dispatch(
        updatePanelConnections({
          panelName,
          connections: newConnections,
          source,
          currentPlayer,
        })
      );

      totalCablesCut += cablesToCut;
      affectedPanels.push(panelName);
    });

    console.log(`⚡ Cut ${cablesPerPanel} cables from each of ${affectedPanels.length} panels (${totalCablesCut} total): ${affectedPanels.join(', ')}`);
    return affectedPanels;
  }

  // Perform engineering rewire on a panel with source tracking
  static engineeringRewire(panelName?: string, source: RewireSource = "minor") {
    const state = store.getState();
    const engineering = state.engineering;
    const currentPlayer = state.game?.currentPlayer || Players.PLAYER_ONE;

    // Get panels that can be rewired based on override rules
    const availablePanels = Object.keys(engineering.panels).filter((panel) => {
      const currentPanel = engineering.panels[panel];
      const correctPanel = engineering.correctState[currentPlayer][panel];

      if (!currentPanel || !correctPanel) return false;

      // Check if this panel can be rewired based on override rules
      return DisasterEvents.canRewirePanel(currentPanel, source);
    });

    // If no panels can be rewired, fall back to spawning asteroids
    if (availablePanels.length === 0) {
      console.log(
        `🛡️ ${source} engineering disaster avoided - falling back to asteroids`
      );
      // Spawn 1-2 small asteroids as fallback
      const count = 1 + Math.floor(Math.random() * 2);
      DisasterEvents.spawnAsteroids(count, count);
      return null;
    }

    const targetPanel =
      panelName && availablePanels.includes(panelName)
        ? panelName
        : availablePanels[Math.floor(Math.random() * availablePanels.length)];

    const panel = engineering.panels[targetPanel];

    if (!panel || panel.connections.length === 0) return null;

    // Pick a random connection
    const randomConnectionIndex = Math.floor(
      Math.random() * panel.connections.length
    );
    const connection = panel.connections[randomConnectionIndex];

    const newConnections = [...panel.connections];

    // 50% chance to remove the connection, 50% chance to rewire it
    if (Math.random() < 0.5 || source === 'minor') {
      // Remove connection
      newConnections.splice(randomConnectionIndex, 1);
    } else {
      // Rewire connection - change one end randomly
      const changeFrom = Math.random() < 0.5;

      if (changeFrom) {
        // Change the 'from' end
        const sameTypeNodes = panel.connections
          .map((c) => c.from)
          .filter((node) => node.type === connection.from.type);

        if (sameTypeNodes.length > 1) {
          const newFromNode =
            sameTypeNodes[Math.floor(Math.random() * sameTypeNodes.length)];
          newConnections[randomConnectionIndex] = {
            ...connection,
            from: newFromNode,
          };
        }
      } else {
        // Change the 'to' end
        const sameTypeNodes = panel.connections
          .map((c) => c.to)
          .filter((node) => node.type === connection.to.type);

        if (sameTypeNodes.length > 1) {
          const newToNode =
            sameTypeNodes[Math.floor(Math.random() * sameTypeNodes.length)];
          newConnections[randomConnectionIndex] = {
            ...connection,
            to: newToNode,
          };
        }
      }
    }

    store.dispatch(
      updatePanelConnections({
        panelName: targetPanel,
        connections: newConnections,
        source: source,
        currentPlayer: currentPlayer,
      })
    );

    return targetPanel;
  }
}

// Define all disaster types with IDs
export const DISASTER_TYPES: Record<string, DisasterType> = {
  // Minor Disasters
  NAV_MISALIGN: {
    id: "NAV_MISALIGN",
    name: "Navigation Misalignment",
    severity: "minor",
    execute: () => {
      const nudgeAmount = Math.random() < 0.5 ? 1 : -1;
      DisasterEvents.nudgeNavigation(nudgeAmount);
    },
  },
  SINGLE_ASTEROID: {
    id: "SINGLE_ASTEROID",
    name: "Single Asteroid",
    severity: "minor",
    execute: () => {
      const count = 1 + Math.floor(Math.random() * 3); // 1-3 asteroids
      DisasterEvents.spawnAsteroids(count, count); // All small
    },
  },
  POWER_SURGE: {
    id: "POWER_SURGE",
    name: "Power Surge",
    severity: "minor",
    execute: () => {
      DisasterEvents.reducePower(50);
    },
  },
  MINOR_REWIRE: {
    id: "MINOR_REWIRE",
    name: "Minor Engineering Rewire",
    severity: "minor",
    execute: () => {
      // Always cut exactly 2 cables for light engineering disaster
      DisasterEvents.cutCables(2, "minor");
    },
  },

  // Major Disasters
  MAJOR_ASTEROID: {
    id: "MAJOR_ASTEROID",
    name: "Major Asteroid",
    severity: "major",
    execute: () => {
      const totalCount = 3 + Math.floor(Math.random() * 3); // 3-5 asteroids
      const largeCount = 1 + Math.floor(Math.random() * 2); // 1-2 large
      const smallCount = totalCount - largeCount;
      DisasterEvents.spawnAsteroids(totalCount, smallCount, 0, largeCount);
    },
  },
  MAJOR_REWIRE: {
    id: "MAJOR_REWIRE",
    name: "Major Engineering Rewire",
    severity: "major",
    execute: () => {
      const state = store.getState();
      const engineering = state.engineering;

      // Get panels that can be affected by major rewire
      const availablePanels = Object.keys(engineering.panels).filter(
        (panel) => {
          const currentPanel = engineering.panels[panel];
          return DisasterEvents.canRewirePanel(currentPanel, "major");
        }
      );

      if (availablePanels.length === 0) {
        console.log(
          "🛡️ Major engineering disaster avoided - falling back to asteroids"
        );
        // Spawn 2-3 asteroids with 1 large for major disaster fallback
        const totalCount = 2 + Math.floor(Math.random() * 2); // 2-3 asteroids
        const largeCount = 1; // 1 large
        const smallCount = totalCount - largeCount;
        DisasterEvents.spawnAsteroids(totalCount, smallCount, 0, largeCount);
        return;
      }

      // Try to affect up to 2 different panels
      const panelsAffected: string[] = [];

      // First panel gets 2 rewires if possible
      const firstPanel =
        availablePanels[Math.floor(Math.random() * availablePanels.length)];
      const firstResult = DisasterEvents.engineeringRewire(firstPanel, "major");
      if (firstResult) {
        panelsAffected.push(firstResult);
        // Try second rewire on same panel (major can override itself)
        DisasterEvents.engineeringRewire(firstPanel, "major");
      }

      // Try to affect a different panel if available
      const otherAvailablePanels = availablePanels.filter(
        (name) => name !== firstPanel
      );
      if (otherAvailablePanels.length > 0) {
        const secondPanel =
          otherAvailablePanels[
            Math.floor(Math.random() * otherAvailablePanels.length)
          ];
        const secondResult = DisasterEvents.engineeringRewire(
          secondPanel,
          "major"
        );
        if (secondResult) {
          panelsAffected.push(secondResult);
        }
      }

      if (panelsAffected.length === 0) {
        console.log(
          "🛡️ Major engineering disaster had no effect - no valid panels to rewire"
        );
      }
    },
  },

  // Catastrophic Disasters
  CATASTROPHIC_REWIRE: {
    id: "CATASTROPHIC_REWIRE",
    name: "Catastrophic Engineering Failure",
    severity: "catastrophic",
    execute: () => {
      const state = store.getState();
      const engineering = state.engineering;

      // Get panels that can be affected by catastrophic rewire
      const availablePanels = Object.keys(engineering.panels).filter(
        (panel) => {
          const currentPanel = engineering.panels[panel];
          return DisasterEvents.canRewirePanel(currentPanel, "catastrophic");
        }
      );

      if (availablePanels.length === 0) {
        console.log(
          "🛡️ Catastrophic engineering disaster avoided - falling back to asteroid cluster"
        );
        // Spawn a significant asteroid cluster for catastrophic disaster fallback
        const totalCount = 5 + Math.floor(Math.random() * 3); // 5-7 asteroids
        const largeCount = 2; // 2 large
        const mediumCount = 1 + Math.floor(Math.random() * 2); // 1-2 medium
        const smallCount = totalCount - largeCount - mediumCount;
        DisasterEvents.spawnAsteroids(totalCount, smallCount, mediumCount, largeCount, 1.3);
        return;
      }

      // Catastrophic affects up to 3 panels with multiple rewires each
      const numPanelsToAffect = Math.min(3, availablePanels.length);
      const selectedPanels = [];
      const availablePanelsCopy = [...availablePanels];

      // Select random panels to affect
      for (
        let i = 0;
        i < numPanelsToAffect && availablePanelsCopy.length > 0;
        i++
      ) {
        const randomIndex = Math.floor(
          Math.random() * availablePanelsCopy.length
        );
        selectedPanels.push(availablePanelsCopy[randomIndex]);
        availablePanelsCopy.splice(randomIndex, 1);
      }

      // Apply 2-3 rewires to each selected panel
      selectedPanels.forEach((panelName) => {
        const numRewires = 2 + Math.floor(Math.random() * 2); // 2-3 rewires
        for (let i = 0; i < numRewires; i++) {
          DisasterEvents.engineeringRewire(panelName, "catastrophic");
        }
      });

      if (selectedPanels.length > 0) {
        console.log(
          `🔥 Catastrophic engineering failure affected ${selectedPanels.length} panels`
        );
      }
    },
  },
  THREE_MINORS: {
    id: "THREE_MINORS",
    name: "Three Minor Disasters",
    severity: "catastrophic",
    execute: () => {
      // Get minor disasters only
      const minorDisasterIds = Object.keys(DISASTER_TYPES).filter(
        (id) => DISASTER_TYPES[id].severity === "minor"
      );

      // Execute three random minor disasters
      for (let i = 0; i < 3; i++) {
        const randomId =
          minorDisasterIds[Math.floor(Math.random() * minorDisasterIds.length)];
        DISASTER_TYPES[randomId].execute();
      }

      // Spawn two small asteroids
      DisasterEvents.spawnAsteroids(2, 2);
    },
  },
  ASTEROID_CLUSTER: {
    id: "ASTEROID_CLUSTER",
    name: "Asteroid Cluster",
    severity: "catastrophic",
    execute: () => {
      const totalCount = 7 + Math.floor(Math.random() * 4); // 7-10 asteroids
      const largeCount = 2 + Math.floor(Math.random() * 2); // 2-3 large
      const mediumCount = 1 + Math.floor(Math.random() * 3); // 1-3 medium
      const smallCount = totalCount - largeCount - mediumCount;

      // Spawn 50% farther away
      DisasterEvents.spawnAsteroids(
        totalCount,
        smallCount,
        mediumCount,
        largeCount,
        1.5
      );
    },
  },
  SABOTAGE: {
    id: "SABOTAGE",
    name: "Sabotage",
    severity: "catastrophic",
    execute: () => {
      const state = store.getState();
      const engineering = state.engineering;
      const currentPlayer = state.game?.currentPlayer || Players.PLAYER_ONE;

      // Remove all connections from all engineering panels
      Object.keys(engineering.panels).forEach((panelName) => {
        store.dispatch(
          updatePanelConnections({
            panelName: panelName,
            connections: [], // Remove all connections
            source: "catastrophic",
            currentPlayer: currentPlayer,
          })
        );
      });

      // Spawn 5 medium asteroids
      DisasterEvents.spawnAsteroids(5, 0, 5, 0, 1.2); // 5 medium asteroids, spawn 20% farther away

      console.log(
        "💥 Sabotage disaster: All engineering connections removed and 5 medium asteroids spawned"
      );
    },
  },
};

// Quadrant-to-disaster mapping with weights
interface DisasterWeight {
  disasterId: string;
  weight: number;
}

export const QUADRANT_DISASTER_WEIGHTS: Record<Quadrant, DisasterWeight[]> = {
  [Quadrant.Alpha]: [
    // Mostly minor disasters in Alpha Quadrant
    { disasterId: "NAV_MISALIGN", weight: 3 },
    { disasterId: "SINGLE_ASTEROID", weight: 5 },
    //{ disasterId: "POWER_SURGE", weight: 3 },
    { disasterId: "MINOR_REWIRE", weight: 30 },
    // Very rare major disaster
    { disasterId: "MAJOR_ASTEROID", weight: 1 },
  ],
  [Quadrant.Beta]: [
    // Mix of minor and major disasters in Beta Quadrant
    { disasterId: "NAV_MISALIGN", weight: 2 },
    { disasterId: "SINGLE_ASTEROID", weight: 3 },
    //{ disasterId: "POWER_SURGE", weight: 2 },
    { disasterId: "MINOR_REWIRE", weight: 15 },
    { disasterId: "MAJOR_ASTEROID", weight: 5 },
    { disasterId: "MAJOR_REWIRE", weight: 4 },
    // Very rare catastrophic
    { disasterId: "THREE_MINORS", weight: 1 },
  ],
  [Quadrant.Gamma]: [
    // Mostly major and catastrophic disasters in Gamma Quadrant
    { disasterId: "NAV_MISALIGN", weight: 1 },
    { disasterId: "SINGLE_ASTEROID", weight: 2 },
    { disasterId: "MINOR_REWIRE", weight: 5 },
    { disasterId: "MAJOR_ASTEROID", weight: 6 },
    { disasterId: "MAJOR_REWIRE", weight: 5 },
    { disasterId: "CATASTROPHIC_REWIRE", weight: 2 },
    { disasterId: "THREE_MINORS", weight: 3 },
    { disasterId: "ASTEROID_CLUSTER", weight: 4 },
    { disasterId: "SABOTAGE", weight: 2 },
  ],
  [Quadrant.Delta]: [
    // Predominantly catastrophic disasters in Delta Quadrant
		{ disasterId: "SINGLE_ASTEROID", weight: 2 },
    { disasterId: "MINOR_REWIRE", weight: 1 },
    { disasterId: "MAJOR_ASTEROID", weight: 4 },
    { disasterId: "MAJOR_REWIRE", weight: 4 },
    { disasterId: "CATASTROPHIC_REWIRE", weight: 6 },
    { disasterId: "THREE_MINORS", weight: 5 },
    { disasterId: "ASTEROID_CLUSTER", weight: 7 },
    { disasterId: "SABOTAGE", weight: 5 },
  ],
};

export class DisasterSystem {
  private lastDisasterTime: number = 0;
  private nextDisasterTime: number = 30; // First disaster after 30 seconds
  private firstDisasterTriggered: boolean = false;
  private recentDisasterHistory: DisasterSeverity[] = [];

  checkForDisaster(
    currentGameTime: number,
    distanceTraveled: number,
    isOnBreak: boolean
  ): void {
    // Don't trigger disasters during breaks
    if (isOnBreak) return;

    // Handle first disaster (always major asteroid after 30 seconds)
    if (!this.firstDisasterTriggered && currentGameTime >= 30) {
      this.triggerFirstDisaster();
      this.firstDisasterTriggered = true;
      this.scheduleNextDisaster(currentGameTime);
      return;
    }

    // Check if it's time for a disaster
    if (
      this.firstDisasterTriggered &&
      currentGameTime >= this.nextDisasterTime
    ) {
      this.triggerRandomDisaster(distanceTraveled);
      this.scheduleNextDisaster(currentGameTime);
    }
  }

  private triggerFirstDisaster(): void {
    // First disaster is always major asteroid
    const majorAsteroidDisaster = DISASTER_TYPES["MAJOR_ASTEROID"];
    if (majorAsteroidDisaster) {
      majorAsteroidDisaster.execute();
      
      // Track this disaster in history
      this.addDisasterToHistory(majorAsteroidDisaster.severity);
      
      disasterEventBus.triggerAnimation("shake"); // General disaster animation
      console.log("🌟 First disaster triggered: Major Asteroid");
    }
  }

  private triggerRandomDisaster(distanceTraveled: number): void {
    const currentQuadrant = getQuadrant(distanceTraveled);

    // Get disaster weights for current quadrant
    const quadrantWeights = QUADRANT_DISASTER_WEIGHTS[currentQuadrant];
    if (!quadrantWeights || quadrantWeights.length === 0) return;

    // Check if we should prevent catastrophic disasters
    const shouldPreventCatastrophic = this.shouldPreventCatastrophicDisaster();

    // Filter out catastrophic disasters if needed
    const filteredWeights = shouldPreventCatastrophic 
      ? quadrantWeights.filter(dw => DISASTER_TYPES[dw.disasterId].severity !== "catastrophic")
      : quadrantWeights;

    // If no disasters left after filtering, use original weights (shouldn't happen in practice)
    const weightsToUse = filteredWeights.length > 0 ? filteredWeights : quadrantWeights;

    // Build weighted array of disaster IDs
    const weightedDisasterIds: string[] = [];
    weightsToUse.forEach((dw) => {
      for (let i = 0; i < dw.weight; i++) {
        weightedDisasterIds.push(dw.disasterId);
      }
    });

    // Pick random disaster ID
    const selectedId =
      weightedDisasterIds[
        Math.floor(Math.random() * weightedDisasterIds.length)
      ];
    const selectedDisaster = DISASTER_TYPES[selectedId];

    if (!selectedDisaster) {
      console.error(`Disaster with ID ${selectedId} not found!`);
      return;
    }

    selectedDisaster.execute();

    // Track this disaster in history
    this.addDisasterToHistory(selectedDisaster.severity);

    // Trigger appropriate animation (navigation misalignment already triggers its own)
    if (selectedDisaster.id !== "NAV_MISALIGN") {
      disasterEventBus.triggerAnimation("shake");
    }

    const preventionNote = shouldPreventCatastrophic ? " (catastrophic disasters prevented)" : "";
    console.log(
      `🌟 Disaster triggered: ${selectedDisaster.name} (${selectedDisaster.severity}) in ${currentQuadrant} Quadrant${preventionNote}`
    );
  }

  private scheduleNextDisaster(currentTime: number): void {
    // Schedule next disaster 30-60 seconds from now
    const delay = 30 + Math.random() * 30;
    this.nextDisasterTime = currentTime + delay;
    this.lastDisasterTime = currentTime;
  }

  private shouldPreventCatastrophicDisaster(): boolean {
    // If we have a catastrophic disaster as the most recent disaster,
    // prevent catastrophic disasters for the next 2 disasters
    if (this.recentDisasterHistory.length === 0) return false;
    
    const mostRecent = this.recentDisasterHistory[this.recentDisasterHistory.length - 1];
    return mostRecent === "catastrophic";
  }

  private addDisasterToHistory(severity: DisasterSeverity): void {
    this.recentDisasterHistory.push(severity);
    
    // Keep only the last 3 disasters in history (current + 2 previous)
    // This allows tracking if the most recent was catastrophic
    if (this.recentDisasterHistory.length > 3) {
      this.recentDisasterHistory.shift();
    }
  }

  reset(): void {
    this.lastDisasterTime = 0;
    this.nextDisasterTime = 30;
    this.firstDisasterTriggered = false;
    this.recentDisasterHistory = [];
  }
}
