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
} from '../store/stations/engineeringStore';
import { getEngineeringAlertTitle, getEngineeringAlertDescription, shouldHideInSummary } from '../constants/engineeringErrors';

export class AutomaticAlertSystem {
  private static instance: AutomaticAlertSystem;
  private currentAlerts = new Map<string, Alert>();

  static getInstance(): AutomaticAlertSystem {
    if (!AutomaticAlertSystem.instance) {
      AutomaticAlertSystem.instance = new AutomaticAlertSystem();
    }
    return AutomaticAlertSystem.instance;
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

    // Define systems and their penalty functions
    const systems = [
      {
        name: "Weapons",
        penalty: getWeaponsPenaltyMultiplier(engineeringState, currentPlayer as typeof Players.PLAYER_ONE),
        warningId: 'weapons-warning',
        dangerId: 'weapons-danger',
        criticalId: 'weapons-critical'
      },
      {
        name: "Fuel",
        penalty: getFuelPenaltyMultiplier(engineeringState, currentPlayer as typeof Players.PLAYER_ONE),
        warningId: 'fuel-warning',
        dangerId: 'fuel-danger',
        criticalId: 'fuel-critical-eng'
      },
      {
        name: "Power",
        penalty: getPowerPenaltyMultiplier(engineeringState, currentPlayer as typeof Players.PLAYER_ONE),
        warningId: 'power-warning',
        dangerId: 'power-danger',
        criticalId: 'power-critical'
      },
      {
        name: "Thrust",
        penalty: getThrustPenaltyMultiplier(engineeringState, currentPlayer as typeof Players.PLAYER_ONE),
        warningId: 'thrust-warning',
        dangerId: 'thrust-danger',
        criticalId: 'thrust-critical'
      },
    ];

    // Process each system with three severity levels based on penalty multiplier
    systems.forEach((system) => {
      // Remove old alerts if penalty changed
      if (system.penalty < 1.5) {
        this.currentAlerts.delete(system.warningId);
        this.currentAlerts.delete(system.dangerId);
        this.currentAlerts.delete(system.criticalId);
      } else if (system.penalty < 2.0) {
        this.currentAlerts.delete(system.dangerId);
        this.currentAlerts.delete(system.criticalId);
      } else if (system.penalty < 5.0) {
        this.currentAlerts.delete(system.warningId);
        this.currentAlerts.delete(system.criticalId);
      } else {
        this.currentAlerts.delete(system.warningId);
        this.currentAlerts.delete(system.dangerId);
      }

      // Add appropriate alert based on penalty level
      if (system.penalty >= 5.0) {
        // Critical: 5x multiplier (heavy penalty)
        const alertId = system.criticalId;
        if (!shouldHideInSummary(system.name, 'Critical')) {
          if (!this.currentAlerts.has(alertId)) {
            const alert = this.createAlert(
              alertId,
              getEngineeringAlertTitle(system.name, 'Critical'),
              getEngineeringAlertDescription(system.name, 'Critical', system.penalty),
              'Critical',
              currentTime
            );
            this.currentAlerts.set(alertId, alert);
            alerts.push(alert);
          } else {
            alerts.push(this.currentAlerts.get(alertId)!);
          }
        }
      } else if (system.penalty >= 2.0) {
        // Danger: 2x multiplier (medium penalty)
        const alertId = system.dangerId;
        if (!shouldHideInSummary(system.name, 'Danger')) {
          if (!this.currentAlerts.has(alertId)) {
            const alert = this.createAlert(
              alertId,
              getEngineeringAlertTitle(system.name, 'Danger'),
              getEngineeringAlertDescription(system.name, 'Danger', system.penalty),
              'Danger',
              currentTime
            );
            this.currentAlerts.set(alertId, alert);
            alerts.push(alert);
          } else {
            alerts.push(this.currentAlerts.get(alertId)!);
          }
        }
      } else if (system.penalty >= 1.5) {
        // Warning: 1.5x multiplier (light penalty)
        const alertId = system.warningId;
        if (!shouldHideInSummary(system.name, 'Warning')) {
          if (!this.currentAlerts.has(alertId)) {
            const alert = this.createAlert(
              alertId,
              getEngineeringAlertTitle(system.name, 'Warning'),
              getEngineeringAlertDescription(system.name, 'Warning', system.penalty),
              'Warning',
              currentTime
            );
            this.currentAlerts.set(alertId, alert);
            alerts.push(alert);
          } else {
            alerts.push(this.currentAlerts.get(alertId)!);
          }
        }
      }
    });

    return alerts;
  }
}