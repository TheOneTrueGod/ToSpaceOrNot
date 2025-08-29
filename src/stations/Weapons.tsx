import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import {
  WEAPON_COLORS,
  MATERIAL_WEAKNESS,
  WEAPON_POWER_REQUIREMENTS,
  setWeaponCooldown,
  popAsteroidLayer,
  WeaponType,
  Asteroid
} from '../store/stations/weaponsStore';
import { updateSystemValue } from '../store/shipStore';
import { getWeaponsPenaltyMultiplier } from '../store/stations/engineeringStore';
import { Players } from '../types';
import { AutomaticAlertSystem } from '../systems/AutomaticAlertSystem';
import { AlertTriangle, AlertCircle, AlertOctagon } from 'lucide-react';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;

const toTotalSeconds = (t: { minutes: number; seconds: number }) => t.minutes * 60 + t.seconds;

export const Weapons: React.FC = () => {
  const dispatch = useDispatch();
  const asteroids = useSelector((s: RootState) => s.weapons.asteroids);
  const cooldownUntil = useSelector((s: RootState) => s.weapons.cooldownUntil);
  const gameClock = useSelector((s: RootState) => s.ship.gameClock);
  const nowSeconds = toTotalSeconds(gameClock);
  const batteryPower = useSelector((s: RootState) => s.ship.batteryPower);
  const engineeringState = useSelector((s: RootState) => s.engineering);
  
  const currentPlayer = useSelector((s: RootState) => s.game.currentPlayer);
  const weaponsPenalty = getWeaponsPenaltyMultiplier(engineeringState, currentPlayer || Players.PLAYER_ONE);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Get all target asteroids with matching weakness on outer layer
  const getTargetAsteroids = useCallback(
    (weapon: WeaponType): Asteroid[] => {
      return asteroids
        .filter(a => a.layers.length > 0 && MATERIAL_WEAKNESS[a.layers[0]] === weapon)
        .sort((a, b) => {
          const ta = toTotalSeconds(a.impactAt) - nowSeconds;
          const tb = toTotalSeconds(b.impactAt) - nowSeconds;
          return ta - tb;
        });
    },
    [asteroids, nowSeconds]
  );

  const fireWeapon = (weapon: WeaponType) => {
    const isReady = cooldownUntil[weapon] <= nowSeconds;
    if (!isReady) return;

    // Calculate actual power requirement with engineering penalty
    const basePowerCost = WEAPON_POWER_REQUIREMENTS[weapon];
    const actualPowerCost = Math.round(basePowerCost * weaponsPenalty);

    // Check if we have enough power (using actual power cost)
    if (batteryPower.current < actualPowerCost) {
      return; // Not enough power to fire
    }

    const targets = getTargetAsteroids(weapon);
    if (targets.length === 0) {
      // Consume power even on miss
      dispatch(updateSystemValue({ 
        system: 'batteryPower', 
        value: -actualPowerCost 
      }));
      dispatch(setWeaponCooldown({ weapon, cooldownSeconds: 3, currentGameSeconds: nowSeconds, engineeringPenalty: weaponsPenalty }));
      return;
    }

    // Consume power for successful shot
    dispatch(updateSystemValue({ 
      system: 'batteryPower', 
      value: -actualPowerCost 
    }));

    // 200ms laser animation then apply effect and set 1s cooldown
    drawLasers(weapon, targets);
    window.setTimeout(() => {
      targets.forEach(target => {
        dispatch(popAsteroidLayer({ asteroidId: target.id }));
      });
      dispatch(setWeaponCooldown({ weapon, cooldownSeconds: 1, currentGameSeconds: nowSeconds + 1, engineeringPenalty: weaponsPenalty }));
    }, 200);
  };

  const drawAsteroid = useCallback((ctx: CanvasRenderingContext2D, asteroid: Asteroid) => {
    const { x, y } = asteroid.position;
    const sides = 8;
    const baseRadius = asteroid.size / 2;

    // Solid white body
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2;
      const px = x + Math.cos(angle) * baseRadius;
      const py = y + Math.sin(angle) * baseRadius;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Concentric outlines for remaining layers
    const layerGap = Math.max(6, Math.floor(baseRadius / Math.max(asteroid.initialLayerCount, 1))); // Increased from 3 to 6
    const layerWidth = Math.max(4, Math.floor(layerGap * 0.6)); // Layer width is 60% of gap, minimum 4px
    
    asteroid.layers.forEach((material, idx) => {
      const r = baseRadius - idx * layerGap - layerWidth / 2;
      if (r <= 4) return;
      
      ctx.strokeStyle = WEAPON_COLORS[MATERIAL_WEAKNESS[material]];
      ctx.lineWidth = layerWidth;
      ctx.beginPath();
      for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2;
        const px = x + Math.cos(angle) * r;
        const py = y + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    });

    // Draw countdown timer if less than 60 seconds until impact
    const timeUntilImpact = toTotalSeconds(asteroid.impactAt) - nowSeconds;
    if (timeUntilImpact < 60 && timeUntilImpact > 0) {
      const text = Math.ceil(timeUntilImpact).toString();
      const fontSize = Math.max(12, Math.floor(baseRadius * 0.4));
      
      ctx.font = `bold ${fontSize}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Draw white outline
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.strokeText(text, x, y);
      
      // Draw black text on top
      ctx.fillStyle = '#000000';
      ctx.fillText(text, x, y);
    }
  }, [nowSeconds]);

  const drawLasers = (weapon: WeaponType, targets: Asteroid[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw laser lines from bottom center to all target centers
    ctx.save();
    ctx.strokeStyle = WEAPON_COLORS[weapon];
    ctx.lineWidth = 3;
    targets.forEach(target => {
      ctx.beginPath();
      ctx.moveTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 10);
      ctx.lineTo(target.position.x, target.position.y);
      ctx.stroke();
    });
    ctx.restore();
  };

  // Render loop: redraw asteroids each tick or when state changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Clear
    ctx.fillStyle = '#1F2937';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (asteroids.length === 0) {
      // Show "No Threats Detected" when no asteroids
      ctx.fillStyle = '#10B981'; // Green color
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No Threats Detected', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    } else {
      // Draw each asteroid
      asteroids.forEach(a => drawAsteroid(ctx, a));
    }
  }, [asteroids, gameClock, drawAsteroid]);

  const buttons: { label: WeaponType; color: string }[] = useMemo(
    () => [
      { label: 'Phasers', color: WEAPON_COLORS.Phasers },
      { label: 'Missiles', color: WEAPON_COLORS.Missiles },
      { label: 'Railgun', color: WEAPON_COLORS.Railgun }
    ],
    []
  );

  // Get weapons-specific alerts
  const alertSystem = AutomaticAlertSystem.getInstance();
  const weaponsAlerts = alertSystem.getWeaponsAlerts(
    engineeringState,
    currentPlayer || Players.PLAYER_ONE,
    batteryPower
  );

  const getAlertIcon = (severity: 'Warning' | 'Danger' | 'Critical') => {
    switch (severity) {
      case 'Critical':
        return <AlertOctagon className="w-5 h-5" />;
      case 'Danger':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getAlertColor = (severity: 'Warning' | 'Danger' | 'Critical') => {
    switch (severity) {
      case 'Critical':
        return 'bg-red-500/20 border-red-500 text-red-400';
      case 'Danger':
        return 'bg-orange-500/20 border-orange-500 text-orange-400';
      default:
        return 'bg-yellow-500/20 border-yellow-500 text-yellow-400';
    }
  };

  return (
    <div className="w-full">
      <div className="flex justify-center">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="bg-gray-800 border border-gray-600 rounded"
        />
      </div>
      <div className="mt-4 flex gap-4 justify-center">
        {buttons.map(btn => {
          const readyIn = Math.max(0, cooldownUntil[btn.label] - nowSeconds);
          const basePowerCost = WEAPON_POWER_REQUIREMENTS[btn.label];
          const actualPowerCost = Math.round(basePowerCost * weaponsPenalty);
          const hasPower = batteryPower.current >= actualPowerCost;
          const disabled = readyIn > 0 || !hasPower;
          const cooldownProgress = readyIn > 0 ? 1 - (readyIn / 3) : 1; // Assuming max cooldown is 3 seconds
          
          return (
            <button
              key={btn.label}
              onClick={() => fireWeapon(btn.label)}
              className={`px-4 py-2 rounded font-mono text-white relative overflow-hidden transition-all ${
                disabled ? 'opacity-60 cursor-not-allowed' : 'hover:brightness-110'
              }`}
              style={{ backgroundColor: btn.color }}
              disabled={disabled}
              title={
                disabled 
                  ? readyIn > 0 
                    ? `Cooldown ${readyIn}s` 
                    : `Insufficient power (${actualPowerCost} required)`
                  : `${btn.label} (${actualPowerCost} power)`
              }
            >
              {/* Cooldown progress bar overlay */}
              {readyIn > 0 && (
                <div
                  className="absolute inset-0 bg-white opacity-30 transition-transform duration-100 ease-linear"
                  style={{
                    transform: `translateX(${(cooldownProgress - 1) * 100}%)`,
                    width: '100%'
                  }}
                />
              )}
              <span className="relative z-10">{btn.label}</span>
            </button>
          );
        })}
      </div>
      
      {/* Alerts Section */}
      <div className="mt-4 space-y-2">
        {weaponsAlerts.weaponsWiringError.active && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded border ${getAlertColor(weaponsAlerts.weaponsWiringError.severity)}`}>
            {getAlertIcon(weaponsAlerts.weaponsWiringError.severity)}
            <span className="font-mono text-sm">
              Weapons Wiring Error: Cooldowns increased by {Math.round((weaponsAlerts.weaponsWiringError.penalty - 1) * 100)}%
            </span>
          </div>
        )}
        
        {weaponsAlerts.powerRegenerationSlow.active && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded border ${getAlertColor(weaponsAlerts.powerRegenerationSlow.severity)}`}>
            {getAlertIcon(weaponsAlerts.powerRegenerationSlow.severity)}
            <span className="font-mono text-sm">
              Power System Error: Regeneration slowed by {Math.round((weaponsAlerts.powerRegenerationSlow.penalty - 1) * 100)}%
            </span>
          </div>
        )}
        
        {weaponsAlerts.powerLow && (
          <div className="flex items-center gap-2 px-3 py-2 rounded border bg-red-500/20 border-red-500 text-red-400">
            <AlertOctagon className="w-5 h-5" />
            <span className="font-mono text-sm">
              Power Low: Unable to fire weapons
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

