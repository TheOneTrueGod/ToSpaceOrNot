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
import { getWeaponsPenaltyMultiplier, getPowerPenaltyMultiplier } from '../store/stations/engineeringStore';
import { Players } from '../types';
import { AlertTriangle, AlertCircle, AlertOctagon } from 'lucide-react';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;

const toTotalSeconds = (t: { minutes: number; seconds: number }) => t.minutes * 60 + t.seconds;

export const Weapons: React.FC = () => {
  const dispatch = useDispatch();
  const asteroids = useSelector((s: RootState) => s.weapons.asteroids);
  const cooldownUntil = useSelector((s: RootState) => s.weapons.cooldownUntil);
  const cooldownStartedAt = useSelector((s: RootState) => s.weapons.cooldownStartedAt);
  const cooldownDuration = useSelector((s: RootState) => s.weapons.cooldownDuration);
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

    // Use base power cost (penalty affects cooldown, not energy cost)
    const basePowerCost = WEAPON_POWER_REQUIREMENTS[weapon];

    // Check if we have enough power (using base power cost)
    if (batteryPower.current < basePowerCost) {
      return; // Not enough power to fire
    }

    const targets = getTargetAsteroids(weapon);
    if (targets.length === 0) {
      // Consume power even on miss (base cost only)
      dispatch(updateSystemValue({ 
        system: 'batteryPower', 
        value: -basePowerCost 
      }));
      dispatch(setWeaponCooldown({ weapon, cooldownSeconds: 3, currentGameSeconds: nowSeconds, engineeringPenalty: weaponsPenalty }));
      return;
    }

    // Consume power for successful shot (base cost only)
    dispatch(updateSystemValue({ 
      system: 'batteryPower', 
      value: -basePowerCost 
    }));

    // 200ms laser animation then apply effect and set 1s cooldown
    drawLasers(weapon, targets);
    window.setTimeout(() => {
      targets.forEach(target => {
        dispatch(popAsteroidLayer({ asteroidId: target.id }));
      });
      // Note: nowSeconds + 1 because the animation takes ~200ms which is less than 1 game second
      dispatch(setWeaponCooldown({ weapon, cooldownSeconds: 3, currentGameSeconds: nowSeconds + 1, engineeringPenalty: weaponsPenalty }));
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

  // Get weapons-specific alerts based on penalty levels
  const powerPenalty = engineeringState ? getPowerPenaltyMultiplier(engineeringState, currentPlayer || Players.PLAYER_ONE) : 1;
  
  // Determine alert levels based on penalty multipliers (matching AutomaticAlertSystem logic)
  const getAlertSeverity = (penalty: number): 'Warning' | 'Danger' | 'Critical' | null => {
    if (penalty >= 5.0) return 'Critical';
    if (penalty >= 2.0) return 'Danger';
    if (penalty >= 1.5) return 'Warning';
    return null;
  };

  const weaponsAlertSeverity = getAlertSeverity(weaponsPenalty);
  const powerAlertSeverity = getAlertSeverity(powerPenalty);
  const powerLow = batteryPower.current < 5; // Minimum weapon power requirement

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

  const getAlertMessage = (system: string, severity: 'Warning' | 'Danger' | 'Critical', penalty: number): string => {
    const increase = Math.round((penalty - 1) * 100);
    if (system === 'Weapons') {
      switch (severity) {
        case 'Critical':
          return `${system} System Critical: Cooldowns increased by ${increase}%`;
        case 'Danger':
          return `${system} System Error: Cooldowns increased by ${increase}%`;
        default:
          return `${system} Wiring Error: Cooldowns increased by ${increase}%`;
      }
    } else {
      // For Power system, it still affects regeneration
      switch (severity) {
        case 'Critical':
          return `${system} System Critical: Regeneration slowed by ${increase}%`;
        case 'Danger':
          return `${system} System Error: Regeneration slowed by ${increase}%`;
        default:
          return `${system} Wiring Error: Regeneration slowed by ${increase}%`;
      }
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
          const hasPower = batteryPower.current >= basePowerCost;
          const disabled = readyIn > 0 || !hasPower;
          
          // Calculate progress based on actual cooldown duration (including penalty)
          const totalDuration = cooldownDuration[btn.label];
          const elapsed = nowSeconds - cooldownStartedAt[btn.label];
          const cooldownProgress = readyIn > 0 && totalDuration > 0 
            ? Math.max(0, Math.min(1, elapsed / totalDuration))
            : 1;
          
          // Calculate the expected cooldown for this weapon type
          // Weapons that hit have 3s cooldown, misses have 1s cooldown
          // We'll show the hit cooldown (3s) as the expected default
          const baseCooldown = 3; // seconds for successful hit
          const expectedCooldown = Math.round(baseCooldown * weaponsPenalty);
          
          return (
            <div key={btn.label} className="flex flex-col items-center">
              <button
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
                      : `Insufficient power (${basePowerCost} required)`
                    : `${btn.label} (${basePowerCost} power)`
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
              <span className="text-sky-400 text-sm font-mono mt-1">
                {readyIn > 0 ? `${readyIn}s` : `${expectedCooldown}s cooldown`}
              </span>
            </div>
          );
        })}
      </div>
      
      {/* Alerts Section */}
      <div className="mt-4 space-y-2">
        {weaponsAlertSeverity && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded border ${getAlertColor(weaponsAlertSeverity)}`}>
            {getAlertIcon(weaponsAlertSeverity)}
            <span className="font-mono text-sm">
              {getAlertMessage('Weapons', weaponsAlertSeverity, weaponsPenalty)}
            </span>
          </div>
        )}
        
        {powerAlertSeverity && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded border ${getAlertColor(powerAlertSeverity)}`}>
            {getAlertIcon(powerAlertSeverity)}
            <span className="font-mono text-sm">
              {getAlertMessage('Power', powerAlertSeverity, powerPenalty)}
            </span>
          </div>
        )}
        
        {powerLow && (
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

