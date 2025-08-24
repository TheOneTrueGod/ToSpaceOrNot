import { store } from "../store";
import { spawnAsteroid } from "../store/stations/weaponsStore";
import { updateSystemValue } from "../store/shipStore";
import { updatePanelConnections } from "../store/stations/engineeringStore";
import { updateNavigationValue } from "../store/stations/navigationStore";
import { disasterEventBus } from "./DisasterEventBus";

export type DisasterSeverity = "minor" | "major" | "catastrophic";

export interface DisasterType {
  name: string;
  severity: DisasterSeverity;
  weight: number;
  minDistance: number; // Minimum distance traveled before this disaster can occur
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
    const availablePanels = Object.keys(engineering.panels);

    if (availablePanels.length === 0) return;

    const targetPanel =
      panelName ||
      availablePanels[Math.floor(Math.random() * availablePanels.length)];
    const panel = engineering.panels[targetPanel];

    if (!panel || panel.connections.length === 0) return;

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
  // Minor Disasters
  {
    name: "Navigation Misalignment",
    severity: "minor",
    weight: 2,
    minDistance: 0,
    execute: () => {
      const nudgeAmount = Math.random() < 0.5 ? 1 : -1;
      DisasterEvents.nudgeNavigation(nudgeAmount);
    },
  },
  {
    name: "Single Asteroid",
    severity: "minor",
    weight: 5,
    minDistance: 0,
    execute: () => {
      const count = 1 + Math.floor(Math.random() * 3); // 1-3 asteroids
      DisasterEvents.spawnAsteroids(count, count); // All small
    },
  },
  {
    name: "Power Surge",
    severity: "minor",
    weight: 2,
    minDistance: 0,
    execute: () => {
      DisasterEvents.reducePower(50);
    },
  },
  {
    name: "Minor Engineering Rewire",
    severity: "minor",
    weight: 3,
    minDistance: 0,
    execute: () => {
      DisasterEvents.engineeringRewire();
    },
  },

  // Major Disasters
  {
    name: "Major Asteroid",
    severity: "major",
    weight: 4,
    minDistance: 250,
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
    minDistance: 250,
    execute: () => {
      const state = store.getState();
      const availablePanels = Object.keys(state.engineering.panels);

      if (availablePanels.length >= 2) {
        // Pick first panel and rewire it twice
        const firstPanel =
          availablePanels[Math.floor(Math.random() * availablePanels.length)];
        DisasterEvents.engineeringRewire(firstPanel);
        DisasterEvents.engineeringRewire(firstPanel);

        // Pick different panel and rewire it once
        const otherPanels = availablePanels.filter(
          (name) => name !== firstPanel
        );
        if (otherPanels.length > 0) {
          const secondPanel =
            otherPanels[Math.floor(Math.random() * otherPanels.length)];
          DisasterEvents.engineeringRewire(secondPanel);
        }
      } else {
        // Fallback to single panel if not enough panels
        DisasterEvents.engineeringRewire();
      }
    },
  },

  // Catastrophic Disasters (only after 500km)
  {
    name: "Three Minor Disasters",
    severity: "catastrophic",
    weight: 2,
    minDistance: 500,
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
    minDistance: 500,
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
    // Filter disasters based on distance and calculate severity bias
    const availableDisasters = DISASTER_TYPES.filter(
      (d) => distanceTraveled >= d.minDistance
    );

    if (availableDisasters.length === 0) return;

    // Apply severity bias based on distance
    const biasedDisasters: DisasterType[] = [];

    availableDisasters.forEach((disaster) => {
      let effectiveWeight = disaster.weight;

      // Increase catastrophic disaster chance after 500km
      if (distanceTraveled >= 500 && disaster.severity === "catastrophic") {
        effectiveWeight *= 3;
      }
      // Slightly increase major disaster chance after 250km
      else if (distanceTraveled >= 250 && disaster.severity === "major") {
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
      `🌟 Disaster triggered: ${selectedDisaster.name} (${selectedDisaster.severity})`
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
