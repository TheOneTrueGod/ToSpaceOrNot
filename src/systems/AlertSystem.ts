import { Alert, SystemEffect, ShipState } from '../types';
import { store } from '../store';
import { updateSystemValue } from '../store/shipStore';

export class AlertSystem {
  static createAlert(
    name: string,
    description: string,
    severity: 'Warning' | 'Danger' | 'Critical',
    owner: 'Gobi' | 'Ben',
    systemEffects: SystemEffect[] = [],
    type: 'manual' | 'automatic' = 'manual'
  ): Alert {
    const currentTime = store.getState().ship.gameClock;
    
    return {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      timestamp: { ...currentTime },
      description,
      severity,
      owner,
      systemEffects,
      isActive: true,
      type
    };
  }

  static applyAlertEffects(alert: Alert) {
    if (!alert.isActive) return;

    alert.systemEffects.forEach(effect => {
      store.dispatch(updateSystemValue({
        system: effect.system,
        value: effect.changePerInterval
      }));
    });
  }

  static checkAlertResolution(alert: Alert): boolean {
    // Placeholder resolution logic - can be customized per alert type
    const state = store.getState().ship;
    
    // Example: Hull damage alerts resolve when hull damage < 20
    if (alert.name.includes('Hull')) {
      return state.hullDamage.current < 20;
    }
    
    // Example: Oxygen alerts resolve when oxygen > 80
    if (alert.name.includes('Oxygen')) {
      return state.oxygenLevels.current > 80;
    }
    
    return false;
  }

  static getSystemChangeIndicator(system: keyof ShipState, previousValue: number, currentValue: number): {
    direction: 'increasing' | 'decreasing' | 'stable';
    intensity: number;
  } {
    const diff = currentValue - previousValue;
    const absChange = Math.abs(diff);
    
    if (absChange < 0.1) {
      return { direction: 'stable', intensity: 0 };
    }
    
    const direction = diff > 0 ? 'increasing' : 'decreasing';
    let intensity = 1;
    
    if (absChange > 5) intensity = 3;
    else if (absChange > 2) intensity = 2;
    
    return { direction, intensity };
  }
}