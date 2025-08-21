import { store } from '../store';
import { advanceTime, addAlert, removeAlert } from '../store/shipStore';
import { AlertSystem } from './AlertSystem';
import { Alert } from '../types';

export class DungeonMaster {
  private gameTimer: number | null = null;
  private lastUpdateTime: number = 0;
  private alertsTriggered: Set<string> = new Set();

  start() {
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
    
    const currentGameTime = state.gameClock.minutes * 60 + state.gameClock.seconds;
    
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
    if (gameTime === 15 && !this.alertsTriggered.has('warning-15')) {
      const warningAlert = AlertSystem.createAlert(
        'Hull Stress Warning',
        'Minor hull stress detected in sector 7. Monitor structural integrity.',
        'Warning',
        'Gobi',
        [{ system: 'hullDamage' as const, changePerInterval: 1 }]
      );
      store.dispatch(addAlert(warningAlert));
      this.alertsTriggered.add('warning-15');
    }
    
    // Critical alert after 30 seconds
    if (gameTime === 30 && !this.alertsTriggered.has('critical-30')) {
      const criticalAlert = AlertSystem.createAlert(
        'Oxygen System Critical',
        'Critical failure in oxygen recycling system. Immediate attention required.',
        'Critical',
        'Ben',
        [{ system: 'oxygenLevels' as const, changePerInterval: -2 }]
      );
      store.dispatch(addAlert(criticalAlert));
      this.alertsTriggered.add('critical-30');
    }
    
    // Danger alert after 60 seconds
    if (gameTime === 60 && !this.alertsTriggered.has('danger-60')) {
      const dangerAlert = AlertSystem.createAlert(
        'Fuel Leak Detected',
        'Dangerous fuel leak in main tank. Containment systems engaged.',
        'Danger',
        'Gobi',
        [{ system: 'fuelLevels' as const, changePerInterval: -1.5 }]
      );
      store.dispatch(addAlert(dangerAlert));
      this.alertsTriggered.add('danger-60');
    }
  }

  private applyAllAlertEffects() {
    const alerts = store.getState().ship.alerts;
    alerts.forEach(alert => {
      if (alert.isActive) {
        AlertSystem.applyAlertEffects(alert);
      }
    });
  }

  private checkAlertResolutions() {
    const alerts = store.getState().ship.alerts;
    alerts.forEach(alert => {
      if (alert.isActive && AlertSystem.checkAlertResolution(alert)) {
        store.dispatch(removeAlert(alert.id));
      }
    });
  }

  reset() {
    this.alertsTriggered.clear();
    this.lastUpdateTime = 0;
  }
}

export const dungeonMaster = new DungeonMaster();