import { Alert, Players } from '../types';
import { ShipState } from '../types';
import { WeaponsState } from '../store/stations/weaponsStore';
import { NavigationState } from '../store/stations/navigationStore';
import {
  EngineeringState,
  getThrustPenaltyMultiplier,
  getFuelPenaltyMultiplier,
  getPowerPenaltyMultiplier,
  getWeaponsPenaltyMultiplier,
  countIncorrectConnections,
} from '../store/stations/engineeringStore';

export class AutomaticAlertSystem {
  private static instance: AutomaticAlertSystem;
  private currentAlerts = new Map<string, Alert>();

  static getInstance(): AutomaticAlertSystem {
    if (!AutomaticAlertSystem.instance) {
      AutomaticAlertSystem.instance = new AutomaticAlertSystem();
    }
    return AutomaticAlertSystem.instance;
  }

  // Get specific weapons-related alerts
  getWeaponsAlerts(
    engineeringState: EngineeringState | undefined,
    currentPlayer: string,
    batteryPower: { current: number; max: number }
  ): { 
    weaponsWiringError: { active: boolean; penalty: number; severity: 'Warning' | 'Danger' | 'Critical' };
    powerRegenerationSlow: { active: boolean; penalty: number; severity: 'Warning' | 'Danger' | 'Critical' };
    powerLow: boolean;
  } {
    const result = {
      weaponsWiringError: { active: false, penalty: 1, severity: 'Warning' as 'Warning' | 'Danger' | 'Critical' },
      powerRegenerationSlow: { active: false, penalty: 1, severity: 'Warning' as 'Warning' | 'Danger' | 'Critical' },
      powerLow: false
    };

    if (!engineeringState) return result;

    // Check weapons wiring error and its penalty
    const weaponsPenalty = getWeaponsPenaltyMultiplier(engineeringState, currentPlayer as typeof Players.PLAYER_ONE);
    if (weaponsPenalty > 1.0) {
      result.weaponsWiringError.active = true;
      result.weaponsWiringError.penalty = weaponsPenalty;
      
      // Determine severity based on penalty multiplier
      if (weaponsPenalty >= 2.0) {
        result.weaponsWiringError.severity = 'Critical';
      } else if (weaponsPenalty >= 1.5) {
        result.weaponsWiringError.severity = 'Danger';
      } else {
        result.weaponsWiringError.severity = 'Warning';
      }
    }

    // Check power regeneration penalty
    const powerPenalty = getPowerPenaltyMultiplier(engineeringState, currentPlayer as typeof Players.PLAYER_ONE);
    if (powerPenalty > 1.0) {
      result.powerRegenerationSlow.active = true;
      result.powerRegenerationSlow.penalty = powerPenalty;
      
      // Determine severity based on penalty multiplier
      if (powerPenalty >= 2.0) {
        result.powerRegenerationSlow.severity = 'Critical';
      } else if (powerPenalty >= 1.5) {
        result.powerRegenerationSlow.severity = 'Danger';
      } else {
        result.powerRegenerationSlow.severity = 'Warning';
      }
    }

    // Check if power is too low to fire any weapon
    // Minimum weapon power requirement is 5 (Phasers)
    result.powerLow = batteryPower.current < 5;

    return result;
  }

  private createAlert(
    id: string,
    name: string,
    description: string,
    severity: 'Warning' | 'Danger' | 'Critical',
    currentTime: { minutes: number; seconds: number }
  ): Alert {
    return {
      id,
      name,
      timestamp: currentTime,
      description,
      severity,
      owner: Players.PLAYER_ONE, // Default owner, could be made dynamic
      systemEffects: [],
      isActive: true,
      type: 'automatic'
    };
  }

  generateAlerts(
    shipState: ShipState,
    weaponsState: WeaponsState,
    navigationState: NavigationState,
    engineeringState: EngineeringState | undefined,
    currentPlayer: string
  ): Alert[] {
    const alerts: Alert[] = [];
    const currentTime = shipState.gameClock;
    const currentSeconds = currentTime.minutes * 60 + currentTime.seconds;

    // Asteroid alerts
    const asteroidAlerts = this.checkAsteroidAlerts(weaponsState, currentTime, currentSeconds);
    alerts.push(...asteroidAlerts);

    // Fuel alerts
    const fuelAlerts = this.checkFuelAlerts(shipState, currentTime);
    alerts.push(...fuelAlerts);

    // Navigation alerts
    const navigationAlerts = this.checkNavigationAlerts(navigationState, currentTime);
    alerts.push(...navigationAlerts);

    // Engineering alerts
    const engineeringAlerts = this.checkEngineeringAlerts(engineeringState, currentTime, currentPlayer);
    alerts.push(...engineeringAlerts);

    return alerts;
  }

  private checkAsteroidAlerts(
    weaponsState: WeaponsState,
    currentTime: { minutes: number; seconds: number },
    currentSeconds: number
  ): Alert[] {
    const alerts: Alert[] = [];
    
    if (weaponsState.asteroids.length === 0) {
      this.currentAlerts.delete('asteroids-incoming');
      this.currentAlerts.delete('asteroids-nearby');
      this.currentAlerts.delete('asteroid-imminent');
      return alerts;
    }

    let hasIncoming = false;
    let hasNearby = false;
    let hasImminent = false;

    weaponsState.asteroids.forEach(asteroid => {
      const impactSeconds = asteroid.impactAt.minutes * 60 + asteroid.impactAt.seconds;
      const timeRemaining = impactSeconds - currentSeconds;

      if (timeRemaining <= 10) {
        hasImminent = true;
      } else if (timeRemaining <= 30) {
        hasNearby = true;
      } else {
        hasIncoming = true;
      }
    });

    // Remove old alerts
    if (!hasImminent) this.currentAlerts.delete('asteroid-imminent');
    if (!hasNearby) this.currentAlerts.delete('asteroids-nearby');
    if (!hasIncoming) this.currentAlerts.delete('asteroids-incoming');

    // Add new alerts
    if (hasImminent && !this.currentAlerts.has('asteroid-imminent')) {
      const alert = this.createAlert(
        'asteroid-imminent',
        'Asteroid Impact Imminent',
        'Asteroid will impact in less than 10 seconds!',
        'Critical',
        currentTime
      );
      this.currentAlerts.set('asteroid-imminent', alert);
      alerts.push(alert);
    } else if (hasImminent) {
      alerts.push(this.currentAlerts.get('asteroid-imminent')!);
    }

    if (hasNearby && !this.currentAlerts.has('asteroids-nearby') && !hasImminent) {
      const alert = this.createAlert(
        'asteroids-nearby',
        'Asteroids Nearby',
        'Asteroids will impact in less than 30 seconds',
        'Danger',
        currentTime
      );
      this.currentAlerts.set('asteroids-nearby', alert);
      alerts.push(alert);
    } else if (hasNearby && !hasImminent) {
      alerts.push(this.currentAlerts.get('asteroids-nearby')!);
    }

    if (hasIncoming && !this.currentAlerts.has('asteroids-incoming') && !hasNearby && !hasImminent) {
      const alert = this.createAlert(
        'asteroids-incoming',
        'Asteroids Incoming',
        'Asteroids detected on collision course',
        'Warning',
        currentTime
      );
      this.currentAlerts.set('asteroids-incoming', alert);
      alerts.push(alert);
    } else if (hasIncoming && !hasNearby && !hasImminent) {
      alerts.push(this.currentAlerts.get('asteroids-incoming')!);
    }

    return alerts;
  }

  private checkFuelAlerts(
    shipState: ShipState,
    currentTime: { minutes: number; seconds: number }
  ): Alert[] {
    const alerts: Alert[] = [];
    const fuelPercentage = (shipState.fuelLevels.current / shipState.fuelLevels.max) * 100;

    // Remove old alerts
    if (fuelPercentage > 0) this.currentAlerts.delete('fuel-empty');
    if (fuelPercentage > 25) this.currentAlerts.delete('fuel-critical');
    if (fuelPercentage > 50) this.currentAlerts.delete('fuel-low');

    if (shipState.fuelLevels.current <= 0 && !this.currentAlerts.has('fuel-empty')) {
      const alert = this.createAlert(
        'fuel-empty',
        'Fuel Depleted',
        'Fuel tanks are completely empty!',
        'Critical',
        currentTime
      );
      this.currentAlerts.set('fuel-empty', alert);
      alerts.push(alert);
    } else if (shipState.fuelLevels.current <= 0) {
      alerts.push(this.currentAlerts.get('fuel-empty')!);
    } else if (fuelPercentage <= 25 && !this.currentAlerts.has('fuel-critical')) {
      const alert = this.createAlert(
        'fuel-critical',
        'Fuel Critical',
        'Fuel levels critically low (25% remaining)',
        'Danger',
        currentTime
      );
      this.currentAlerts.set('fuel-critical', alert);
      alerts.push(alert);
    } else if (fuelPercentage <= 25) {
      alerts.push(this.currentAlerts.get('fuel-critical')!);
    } else if (fuelPercentage <= 50 && !this.currentAlerts.has('fuel-low')) {
      const alert = this.createAlert(
        'fuel-low',
        'Fuel Low',
        'Fuel levels are running low (50% remaining)',
        'Warning',
        currentTime
      );
      this.currentAlerts.set('fuel-low', alert);
      alerts.push(alert);
    } else if (fuelPercentage <= 50) {
      alerts.push(this.currentAlerts.get('fuel-low')!);
    }

    return alerts;
  }

  private checkNavigationAlerts(
    navigationState: NavigationState,
    currentTime: { minutes: number; seconds: number }
  ): Alert[] {
    const alerts: Alert[] = [];
    const tolerance = 0.5; // Tolerance for considering values "correct"
    
    // Check navigation alignment against both players' correct values
    // If current values don't match either player's correct values, there's an issue
    const issues = [];
    
    const currentPitch = navigationState.current.pitch;
    const currentYaw = navigationState.current.yaw;
    const currentRoll = navigationState.current.roll;
    
    const albatrossCorrect = navigationState.correctValues.albatross;
    const kestrelCorrect = navigationState.correctValues.kestrel;
    
    // Check if pitch matches either player's correct value
    const pitchMatchesAlbatross = Math.abs(currentPitch - albatrossCorrect.pitch) <= tolerance;
    const pitchMatchesKestrel = Math.abs(currentPitch - kestrelCorrect.pitch) <= tolerance;
    if (!pitchMatchesAlbatross && !pitchMatchesKestrel) {
      issues.push('pitch');
    }
    
    // Check if yaw matches either player's correct value
    const yawMatchesAlbatross = Math.abs(currentYaw - albatrossCorrect.yaw) <= tolerance;
    const yawMatchesKestrel = Math.abs(currentYaw - kestrelCorrect.yaw) <= tolerance;
    if (!yawMatchesAlbatross && !yawMatchesKestrel) {
      issues.push('yaw');
    }
    
    // Check if roll matches either player's correct value
    const rollMatchesAlbatross = Math.abs(currentRoll - albatrossCorrect.roll) <= tolerance;
    const rollMatchesKestrel = Math.abs(currentRoll - kestrelCorrect.roll) <= tolerance;
    if (!rollMatchesAlbatross && !rollMatchesKestrel) {
      issues.push('roll');
    }

    // Remove old alerts
    if (issues.length < 3) this.currentAlerts.delete('navigation-critical');
    if (issues.length < 2) this.currentAlerts.delete('navigation-danger');
    if (issues.length < 1) this.currentAlerts.delete('navigation-warning');

    if (issues.length >= 3 && !this.currentAlerts.has('navigation-critical')) {
      const alert = this.createAlert(
        'navigation-critical',
        'Navigation Critical',
        'All navigation values are misaligned',
        'Critical',
        currentTime
      );
      this.currentAlerts.set('navigation-critical', alert);
      alerts.push(alert);
    } else if (issues.length >= 3) {
      alerts.push(this.currentAlerts.get('navigation-critical')!);
    } else if (issues.length >= 2 && !this.currentAlerts.has('navigation-danger')) {
      const alert = this.createAlert(
        'navigation-danger',
        'Navigation Error',
        `Navigation misaligned: ${issues.join(', ')}`,
        'Danger',
        currentTime
      );
      this.currentAlerts.set('navigation-danger', alert);
      alerts.push(alert);
    } else if (issues.length >= 2) {
      alerts.push(this.currentAlerts.get('navigation-danger')!);
    } else if (issues.length >= 1 && !this.currentAlerts.has('navigation-warning')) {
      const alert = this.createAlert(
        'navigation-warning',
        'Navigation Warning',
        `Navigation misaligned: ${issues.join(', ')}`,
        'Warning',
        currentTime
      );
      this.currentAlerts.set('navigation-warning', alert);
      alerts.push(alert);
    } else if (issues.length >= 1) {
      alerts.push(this.currentAlerts.get('navigation-warning')!);
    }

    return alerts;
  }

  private checkEngineeringAlerts(
    engineeringState: EngineeringState | undefined,
    currentTime: { minutes: number; seconds: number },
    currentPlayer: string
  ): Alert[] {
    const alerts: Alert[] = [];
    
    if (!engineeringState) return alerts;

    // Check for system malfunctions (penalties >= 2.0)
    const malfunctionSystems = [
      {
        name: "Weapons",
        penalty: getWeaponsPenaltyMultiplier(engineeringState, currentPlayer as typeof Players.PLAYER_ONE),
        alertId: 'weapons-malfunction'
      },
      {
        name: "Fuel",
        penalty: getFuelPenaltyMultiplier(engineeringState, currentPlayer as typeof Players.PLAYER_ONE),
        alertId: 'fuel-malfunction'
      },
      {
        name: "Power",
        penalty: getPowerPenaltyMultiplier(engineeringState, currentPlayer as typeof Players.PLAYER_ONE),
        alertId: 'power-malfunction'
      },
      {
        name: "Thrust",
        penalty: getThrustPenaltyMultiplier(engineeringState, currentPlayer as typeof Players.PLAYER_ONE),
        alertId: 'thrust-malfunction'
      },
    ];

    malfunctionSystems.forEach((system) => {
      const hasAlert = this.currentAlerts.has(system.alertId);
      
      if (system.penalty >= 2.0 && !hasAlert) {
        // Add malfunction alert
        const malfunctionAlert = this.createAlert(
          system.alertId,
          `${system.name} Malfunction`,
          `${system.name} system experiencing significant malfunctions due to engineering panel damage.`,
          'Danger',
          currentTime
        );
        this.currentAlerts.set(system.alertId, malfunctionAlert);
        alerts.push(malfunctionAlert);
      } else if (system.penalty >= 2.0 && hasAlert) {
        // Keep existing alert
        alerts.push(this.currentAlerts.get(system.alertId)!);
      } else if (system.penalty < 2.0 && hasAlert) {
        // Remove malfunction alert
        this.currentAlerts.delete(system.alertId);
      }
    });

    // Check for individual station wiring error alerts (yellow warnings)
    const stationMapping: { [panelName: string]: string } = {
      A1b2: "Weapons",
      Xy9Z: "Thrust",
      "3Fp7": "Fuel",
      Q8wS: "Power",
    };

    // Track which stations have errors
    const stationsWithErrors: string[] = [];

    for (const panelName of Object.keys(engineeringState.panels)) {
      const currentPanel = engineeringState.panels[panelName];
      const correctPanel =
        engineeringState.correctState[currentPlayer as typeof Players.PLAYER_ONE][panelName];

      if (currentPanel && correctPanel) {
        const incorrectCount = countIncorrectConnections(
          currentPanel.connections,
          correctPanel.connections
        );
        if (incorrectCount > 0 && stationMapping[panelName]) {
          stationsWithErrors.push(stationMapping[panelName]);
        }
      }
    }

    // Create or remove alerts for each station
    ["Weapons", "Thrust", "Fuel", "Power"].forEach((stationName) => {
      const alertId = `${stationName.toLowerCase()}-wiring-error`;
      const hasAlert = this.currentAlerts.has(alertId);
      const hasError = stationsWithErrors.includes(stationName);

      if (hasError && !hasAlert) {
        // Add station-specific wiring error alert
        const wiringAlert = this.createAlert(
          alertId,
          `${stationName} Wiring Error`,
          `${stationName} panel has incorrect wiring connections. Check panel for errors.`,
          'Warning',
          currentTime
        );
        this.currentAlerts.set(alertId, wiringAlert);
        alerts.push(wiringAlert);
      } else if (hasError && hasAlert) {
        // Keep existing alert
        alerts.push(this.currentAlerts.get(alertId)!);
      } else if (!hasError && hasAlert) {
        // Remove station-specific wiring error alert
        this.currentAlerts.delete(alertId);
      }
    });

    return alerts;
  }
}