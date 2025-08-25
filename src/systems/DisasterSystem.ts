import { store } from "../store";
import { spawnAsteroid } from "../store/stations/weaponsStore";
import { updateSystemValue } from "../store/shipStore";
import { updatePanelConnections, countIncorrectConnections } from "../store/stations/engineeringStore";
import { updateNavigationValue } from "../store/stations/navigationStore";
import { disasterEventBus } from "./DisasterEventBus";
import { Quadrant, QUADRANT_BOUNDARIES, getQuadrant } from "../types";

export type DisasterSeverity = "minor" | "major" | "catastrophic";

export interface DisasterType {
  name: string;
  severity: DisasterSeverity;
  weight: number;
  minQuadrant: Quadrant; // Minimum quadrant before this disaster can occur
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
      const baseImpactTime = 20 + Math.random() * 70; // 20-90 seconds
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

  // Perform engineering rewire on a panel
  static engineeringRewire(panelName?: string) {
    const state = store.getState();
    const engineering = state.engineering;
    const currentPlayer = state.game?.currentPlayer || 'Gobi';
    
    // Get panels that don't have errors (are correctly wired)
    const availablePanels = Object.keys(engineering.panels).filter(panel => {
      const currentPanel = engineering.panels[panel];
      const correctPanel = engineering.correctState[currentPlayer][panel];
      
      if (!currentPanel || !correctPanel) return false;
      
      const incorrectCount = countIncorrectConnections(
        currentPanel.connections,
        correctPanel.connections
      );
      
      // Only consider panels with no errors
      return incorrectCount === 0;
    });

    // If no panels without errors, nothing happens
    if (availablePanels.length === 0) {
      console.log("🛡️ Engineering disaster avoided - all panels already have errors");
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
    if (Math.random() < 0.5) {
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
      })
    );

    return targetPanel;
  }
}

// Define all disaster types
export const DISASTER_TYPES: DisasterType[] = [
  // Minor Disasters (can occur in Alpha Quadrant)
  {
    name: "Navigation Misalignment",
    severity: "minor",
    weight: 2,
    minQuadrant: Quadrant.Alpha,
    execute: () => {
      const nudgeAmount = Math.random() < 0.5 ? 1 : -1;
      DisasterEvents.nudgeNavigation(nudgeAmount);
    },
  },
  {
    name: "Single Asteroid",
    severity: "minor",
    weight: 5,
    minQuadrant: Quadrant.Alpha,
    execute: () => {
      const count = 1 + Math.floor(Math.random() * 3); // 1-3 asteroids
      DisasterEvents.spawnAsteroids(count, count); // All small
    },
  },
  {
    name: "Power Surge",
    severity: "minor",
    weight: 2,
    minQuadrant: Quadrant.Alpha,
    execute: () => {
      DisasterEvents.reducePower(50);
    },
  },
  {
    name: "Minor Engineering Rewire",
    severity: "minor",
    weight: 30,
    minQuadrant: Quadrant.Alpha,
    execute: () => {
      DisasterEvents.engineeringRewire();
    },
  },

  // Major Disasters (only in Beta Quadrant and beyond)
  {
    name: "Major Asteroid",
    severity: "major",
    weight: 4,
    minQuadrant: Quadrant.Beta,
    execute: () => {
      const totalCount = 3 + Math.floor(Math.random() * 3); // 3-5 asteroids
      const largeCount = 1 + Math.floor(Math.random() * 2); // 1-2 large
      const smallCount = totalCount - largeCount;
      DisasterEvents.spawnAsteroids(totalCount, smallCount, 0, largeCount);
    },
  },
  {
    name: "Major Engineering Rewire",
    severity: "major",
    weight: 3,
    minQuadrant: Quadrant.Beta,
    execute: () => {
      const state = store.getState();
      const currentPlayer = state.game?.currentPlayer || 'Gobi';
      
      // Get panels that don't have errors
      const availablePanels = Object.keys(state.engineering.panels).filter(panel => {
        const currentPanel = state.engineering.panels[panel];
        const correctPanel = state.engineering.correctState[currentPlayer][panel];
        
        if (!currentPanel || !correctPanel) return false;
        
        const incorrectCount = countIncorrectConnections(
          currentPanel.connections,
          correctPanel.connections
        );
        
        return incorrectCount === 0;
      });

      if (availablePanels.length === 0) {
        console.log("🛡️ Major engineering disaster avoided - all panels already have errors");
        return;
      }

      // Try to affect up to 2 different panels
      const panelsAffected: string[] = [];
      
      // First panel gets 2 rewires if possible
      const firstPanel = availablePanels[Math.floor(Math.random() * availablePanels.length)];
      const firstResult = DisasterEvents.engineeringRewire(firstPanel);
      if (firstResult) {
        panelsAffected.push(firstResult);
        // Try second rewire on same panel (it might now have an error after first rewire)
        DisasterEvents.engineeringRewire(firstPanel);
      }

      // Try to affect a different panel if available
      const otherAvailablePanels = availablePanels.filter(name => name !== firstPanel);
      if (otherAvailablePanels.length > 0) {
        const secondPanel = otherAvailablePanels[Math.floor(Math.random() * otherAvailablePanels.length)];
        const secondResult = DisasterEvents.engineeringRewire(secondPanel);
        if (secondResult) {
          panelsAffected.push(secondResult);
        }
      }
      
      if (panelsAffected.length === 0) {
        console.log("🛡️ Major engineering disaster had no effect - all targeted panels had errors");
      }
    },
  },

  // Catastrophic Disasters (only in Gamma Quadrant and beyond)
  {
    name: "Three Minor Disasters",
    severity: "catastrophic",
    weight: 2,
    minQuadrant: Quadrant.Gamma,
    execute: () => {
      // Get minor disasters only
      const minorDisasters = DISASTER_TYPES.filter(
        (d) => d.severity === "minor"
      );

      // Execute three random minor disasters
      for (let i = 0; i < 3; i++) {
        const randomDisaster =
          minorDisasters[Math.floor(Math.random() * minorDisasters.length)];
        randomDisaster.execute();
      }

      // Spawn two small asteroids
      DisasterEvents.spawnAsteroids(2, 2);
    },
  },
  {
    name: "Asteroid Cluster",
    severity: "catastrophic",
    weight: 3,
    minQuadrant: Quadrant.Gamma,
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
];

export class DisasterSystem {
  private lastDisasterTime: number = 0;
  private nextDisasterTime: number = 30; // First disaster after 30 seconds
  private firstDisasterTriggered: boolean = false;

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
    const majorAsteroidDisaster = DISASTER_TYPES.find(
      (d) => d.name === "Major Asteroid"
    );
    if (majorAsteroidDisaster) {
      majorAsteroidDisaster.execute();
      disasterEventBus.triggerAnimation("shake"); // General disaster animation
      console.log("🌟 First disaster triggered: Major Asteroid");
    }
  }

  private triggerRandomDisaster(distanceTraveled: number): void {
    const currentQuadrant = getQuadrant(distanceTraveled);
    
    // Helper to check if a quadrant meets the minimum requirement
    const quadrantOrder = [Quadrant.Alpha, Quadrant.Beta, Quadrant.Gamma, Quadrant.Delta];
    const meetsQuadrantRequirement = (minQuadrant: Quadrant): boolean => {
      return quadrantOrder.indexOf(currentQuadrant) >= quadrantOrder.indexOf(minQuadrant);
    };

    // Filter disasters based on quadrant
    const availableDisasters = DISASTER_TYPES.filter(
      (d) => meetsQuadrantRequirement(d.minQuadrant)
    );

    if (availableDisasters.length === 0) return;

    // Apply severity bias based on quadrant
    const biasedDisasters: DisasterType[] = [];

    availableDisasters.forEach((disaster) => {
      let effectiveWeight = disaster.weight;

      // Increase catastrophic disaster chance in Gamma Quadrant and beyond
      if (currentQuadrant === Quadrant.Gamma || currentQuadrant === Quadrant.Delta) {
        if (disaster.severity === "catastrophic") {
          effectiveWeight *= 3;
        }
      }
      // Slightly increase major disaster chance in Beta Quadrant and beyond
      if (currentQuadrant !== Quadrant.Alpha && disaster.severity === "major") {
        effectiveWeight *= 2;
      }

      // Add disaster multiple times based on weight
      for (let i = 0; i < effectiveWeight; i++) {
        biasedDisasters.push(disaster);
      }
    });

    // Pick random disaster
    const selectedDisaster =
      biasedDisasters[Math.floor(Math.random() * biasedDisasters.length)];
    selectedDisaster.execute();

    // Trigger appropriate animation (navigation misalignment already triggers its own)
    if (selectedDisaster.name !== "Navigation Misalignment") {
      disasterEventBus.triggerAnimation("shake");
    }

    console.log(
      `🌟 Disaster triggered: ${selectedDisaster.name} (${selectedDisaster.severity}) in ${currentQuadrant} Quadrant`
    );
  }

  private scheduleNextDisaster(currentTime: number): void {
    // Schedule next disaster 10-30 seconds from now
    const delay = 10 + Math.random() * 20;
    this.nextDisasterTime = currentTime + delay;
    this.lastDisasterTime = currentTime;
  }

  reset(): void {
    this.lastDisasterTime = 0;
    this.nextDisasterTime = 30;
    this.firstDisasterTriggered = false;
  }
}
