import { store } from "../store";
import {
  advanceTime,
  addAlert,
  removeAlert,
  setAutomaticAlerts,
  gameTick,
  handleAsteroidImpacts,
  updateSystemValue,
} from "../store/shipStore";
import { AlertSystem } from "./AlertSystem";
import { AutomaticAlertSystem } from "./AutomaticAlertSystem";
import { spawnAsteroid, removeAsteroid } from "../store/stations/weaponsStore";
import { NavigationState } from "../store/stations/navigationStore";

export class DungeonMaster {
  private gameTimer: number | null = null;
  private alertsTriggered: Set<string> = new Set();
  private automaticAlertSystem = AutomaticAlertSystem.getInstance();

  private calculateShipSpeed(): number {
    const state = store.getState();
    const shipState = state.ship;
    const navigationState = state.navigation;

    // If no fuel, ship can't move
    if (shipState.fuelLevels.current <= 0) {
      return 0;
    }

    let speed = 2; // Base speed

    // Check navigation alignment
    const navErrors = this.countNavigationErrors(navigationState);
    if (navErrors === 1) {
      speed -= 1; // One navigation number incorrect
    } else if (navErrors >= 2) {
      speed -= 2; // Two or more navigation numbers incorrect
    }

    // Check fuel levels
    const fuelPercentage =
      shipState.fuelLevels.current / shipState.fuelLevels.max;
    if (fuelPercentage < 0.25) {
      speed -= 1; // Fuel below 1/4
    }

    // Ensure speed doesn't go negative
    return Math.max(0, speed);
  }

  private countNavigationErrors(
    navigationState: NavigationState | undefined
  ): number {
    if (!navigationState) return 0;

    let errors = 0;
    const tolerance = 0.1; // Small tolerance for floating point comparison

    if (
      Math.abs(navigationState.current.pitch - navigationState.correct.pitch) >
      tolerance
    ) {
      errors++;
    }
    if (
      Math.abs(navigationState.current.yaw - navigationState.correct.yaw) >
      tolerance
    ) {
      errors++;
    }
    if (
      Math.abs(navigationState.current.roll - navigationState.correct.roll) >
      tolerance
    ) {
      errors++;
    }

    return errors;
  }

  start() {
    // Spawn a few initial asteroids for testing the weapons system
    const gameClock = store.getState().ship.gameClock;
    for (let i = 0; i < 3; i++) {
      store.dispatch(spawnAsteroid({ currentGameTime: gameClock }));
    }

    this.gameTimer = setInterval(() => {
      this.gameLoop();
    }, 1000); // Every real second
  }

  stop() {
    if (this.gameTimer) {
      clearInterval(this.gameTimer);
      this.gameTimer = null;
    }
  }

  private gameLoop() {
    const state = store.getState().ship;

    // Advance game time
    store.dispatch(advanceTime());

    // Process game tick (power restoration, etc.)
    store.dispatch(gameTick());

    // Generate automatic alerts based on current state
    const currentState = store.getState();
    const automaticAlerts = this.automaticAlertSystem.generateAlerts(
      currentState.ship,
      currentState.weapons,
      currentState.navigation
    );
    store.dispatch(setAutomaticAlerts(automaticAlerts));

    // Update distance travelled based on speed
    const speed = this.calculateShipSpeed();
    if (speed > 0) {
      store.dispatch(
        updateSystemValue({
          system: "distanceToDestination",
          value: -speed, // Negative to decrease distance to destination
          isCurrentValue: true,
        })
      );
    }

    // Decrease fuel by 1 each game update
    store.dispatch(
      updateSystemValue({
        system: "fuelLevels",
        value: -1,
        isCurrentValue: true,
      })
    );

    // Check for asteroid impacts
    const weaponsState = store.getState().weapons;
    if (weaponsState && weaponsState.asteroids) {
      store.dispatch(
        handleAsteroidImpacts({ asteroids: weaponsState.asteroids })
      );
    }

    const asteroids = store.getState().weapons.asteroids;
    const currentGameSeconds =
      state.gameClock.minutes * 60 + state.gameClock.seconds;

    // Check for asteroids that have impacted and need to be removed
    asteroids.forEach((asteroid) => {
      const asteroidImpactSeconds =
        asteroid.impactAt.minutes * 60 + asteroid.impactAt.seconds;
      if (asteroidImpactSeconds <= currentGameSeconds) {
        // Remove the asteroid from the weapons store
        store.dispatch(removeAsteroid({ asteroidId: asteroid.id }));
      }
    });

    const currentGameTime =
      state.gameClock.minutes * 60 + state.gameClock.seconds;

    // Trigger timed alerts
    this.checkTimedAlerts(currentGameTime);

    // Apply alert effects every 10 game minutes (600 game seconds)
    if (currentGameTime > 0 && currentGameTime % 600 === 0) {
      this.applyAllAlertEffects();
    }

    // Check for alert resolutions
    this.checkAlertResolutions();
  }

  private checkTimedAlerts(gameTime: number) {
    // Warning alert after 15 seconds
    if (gameTime === 15 && !this.alertsTriggered.has("warning-15")) {
      const warningAlert = AlertSystem.createAlert(
        "Hull Stress Warning",
        "Minor hull stress detected in sector 7. Monitor structural integrity.",
        "Warning",
        "Gobi",
        [{ system: "hullDamage" as const, changePerInterval: 1 }],
        "manual"
      );
      store.dispatch(addAlert(warningAlert));
      this.alertsTriggered.add("warning-15");
    }

    // Critical alert after 30 seconds
    if (gameTime === 30 && !this.alertsTriggered.has("critical-30")) {
      const criticalAlert = AlertSystem.createAlert(
        "Oxygen System Critical",
        "Critical failure in oxygen recycling system. Immediate attention required.",
        "Critical",
        "Ben",
        [{ system: "oxygenLevels" as const, changePerInterval: -2 }],
        "manual"
      );
      store.dispatch(addAlert(criticalAlert));
      this.alertsTriggered.add("critical-30");
    }

    // Danger alert after 60 seconds
    if (gameTime === 60 && !this.alertsTriggered.has("danger-60")) {
      const dangerAlert = AlertSystem.createAlert(
        "Fuel Leak Detected",
        "Dangerous fuel leak in main tank. Containment systems engaged.",
        "Danger",
        "Gobi",
        [{ system: "fuelLevels" as const, changePerInterval: -1.5 }],
        "manual"
      );
      store.dispatch(addAlert(dangerAlert));
      this.alertsTriggered.add("danger-60");
    }
  }

  private applyAllAlertEffects() {
    const alerts = store.getState().ship.alerts;
    alerts.forEach((alert) => {
      if (alert.isActive) {
        AlertSystem.applyAlertEffects(alert);
      }
    });
  }

  private checkAlertResolutions() {
    const alerts = store.getState().ship.alerts;
    alerts.forEach((alert) => {
      if (alert.isActive && AlertSystem.checkAlertResolution(alert)) {
        store.dispatch(removeAlert(alert.id));
      }
    });
  }

  reset() {
    this.alertsTriggered.clear();
  }
}

export const dungeonMaster = new DungeonMaster();
