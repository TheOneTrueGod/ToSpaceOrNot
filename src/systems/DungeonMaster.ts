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
import {
  getThrustPenaltyMultiplier,
  getFuelPenaltyMultiplier,
  getPowerPenaltyMultiplier,
  getWeaponsPenaltyMultiplier,
} from "../store/stations/engineeringStore";
import { isPulseFrequencyCorrect } from "../store/stations/scienceStore";

export class DungeonMaster {
  private gameTimer: number | null = null;
  private alertsTriggered: Set<string> = new Set();
  private automaticAlertSystem = AutomaticAlertSystem.getInstance();

  private calculateShipSpeed(): number {
    const state = store.getState();
    const shipState = state.ship;
    const navigationState = state.navigation;
    const engineeringState = state.engineering;

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

    // Apply engineering thrust penalty
    if (engineeringState) {
      const thrustPenalty = getThrustPenaltyMultiplier(engineeringState);
      speed /= thrustPenalty;
    }

    // Ensure speed doesn't go negative
    return Math.max(0, Math.round(speed * 10) / 10); // Round to 1 decimal place
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

  private checkEngineeringMalfunctions() {
    const state = store.getState();
    const engineeringState = state.engineering;
    const currentAlerts = state.ship.alerts;

    if (!engineeringState) return;

    const malfunctionSystems = [
      {
        name: "Weapons",
        penalty: getWeaponsPenaltyMultiplier(engineeringState),
      },
      { name: "Fuel", penalty: getFuelPenaltyMultiplier(engineeringState) },
      { name: "Power", penalty: getPowerPenaltyMultiplier(engineeringState) },
      { name: "Thrust", penalty: getThrustPenaltyMultiplier(engineeringState) },
    ];

    malfunctionSystems.forEach((system) => {
      const alertName = `${system.name} Malfunction`;
      const hasAlert = currentAlerts.some(
        (alert) => alert.name === alertName && alert.isActive
      );

      if (system.penalty >= 2.0 && !hasAlert) {
        // Add malfunction alert
        const malfunctionAlert = AlertSystem.createAlert(
          alertName,
          `${system.name} system experiencing significant malfunctions due to engineering panel damage.`,
          "Danger",
          "Gobi", // Default owner, could be made configurable
          [],
          "automatic"
        );
        store.dispatch(addAlert(malfunctionAlert));
      } else if (system.penalty < 2.0 && hasAlert) {
        // Remove malfunction alert
        const alertToRemove = currentAlerts.find(
          (alert) => alert.name === alertName && alert.isActive
        );
        if (alertToRemove) {
          store.dispatch(removeAlert(alertToRemove.id));
        }
      }
    });
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

    // Calculate engineering and science parameters for game tick
    const currentState = store.getState();
    const engineeringState = currentState.engineering;
    const scienceState = currentState.science;

    const engineeringPenalty = engineeringState
      ? getPowerPenaltyMultiplier(engineeringState)
      : 1;
    const scienceCorrect = scienceState
      ? isPulseFrequencyCorrect(scienceState)
      : true;

    // Process game tick (power restoration, etc.)
    store.dispatch(gameTick({ engineeringPenalty, scienceCorrect }));

    // Generate automatic alerts based on current state
    const alertsState = store.getState();
    const automaticAlerts = this.automaticAlertSystem.generateAlerts(
      alertsState.ship,
      alertsState.weapons,
      alertsState.navigation
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

    // Decrease fuel each game update, factoring in engineering penalties
    const baselineFuelConsumption = -1;
    let fuelConsumption = baselineFuelConsumption;

    if (engineeringState) {
      const fuelPenalty = getFuelPenaltyMultiplier(engineeringState);
      fuelConsumption *= fuelPenalty;
    }

    store.dispatch(
      updateSystemValue({
        system: "fuelLevels",
        value: Math.round(fuelConsumption),
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

    // Check for engineering malfunctions
    this.checkEngineeringMalfunctions();
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
