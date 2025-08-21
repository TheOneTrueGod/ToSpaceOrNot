import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import {
  WEAPON_COLORS,
  MATERIAL_WEAKNESS,
  setWeaponCooldown,
  popAsteroidLayer,
  WeaponType,
  Asteroid
} from '../store/stations/weaponsStore';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;

const toTotalSeconds = (t: { minutes: number; seconds: number }) => t.minutes * 60 + t.seconds;

export const Weapons: React.FC = () => {
  const dispatch = useDispatch();
  const asteroids = useSelector((s: RootState) => s.weapons.asteroids);
  const cooldownUntil = useSelector((s: RootState) => s.weapons.cooldownUntil);
  const gameClock = useSelector((s: RootState) => s.ship.gameClock);
  const nowSeconds = toTotalSeconds(gameClock);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Pick target asteroid by rule: least time remaining to impact and matching weakness on outer layer
  const getTargetAsteroid = useCallback(
    (weapon: WeaponType): Asteroid | undefined => {
      const matching = asteroids
        .filter(a => a.layers.length > 0 && MATERIAL_WEAKNESS[a.layers[0]] === weapon)
        .sort((a, b) => {
          const ta = toTotalSeconds(a.impactAt) - nowSeconds;
          const tb = toTotalSeconds(b.impactAt) - nowSeconds;
          return ta - tb;
        });
      return matching[0];
    },
    [asteroids, nowSeconds]
  );

  const fireWeapon = (weapon: WeaponType) => {
    const isReady = cooldownUntil[weapon] <= nowSeconds;
    if (!isReady) return;

    const target = getTargetAsteroid(weapon);
    if (!target) {
      dispatch(setWeaponCooldown({ weapon, cooldownSeconds: 3, currentGameSeconds: nowSeconds }));
      return;
    }

    // 200ms laser animation then apply effect and set 1s cooldown
    drawLaserOnce(weapon, target);
    window.setTimeout(() => {
      dispatch(popAsteroidLayer({ asteroidId: target.id }));
      dispatch(setWeaponCooldown({ weapon, cooldownSeconds: 1, currentGameSeconds: nowSeconds + 1 }));
    }, 200);
  };

  const drawAsteroid = (ctx: CanvasRenderingContext2D, asteroid: Asteroid) => {
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
  };

  const drawLaserOnce = (weapon: WeaponType, target: Asteroid) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw a quick laser line from bottom center to target center
    ctx.save();
    ctx.strokeStyle = WEAPON_COLORS[weapon];
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 10);
    ctx.lineTo(target.position.x, target.position.y);
    ctx.stroke();
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

    // Draw each asteroid
    asteroids.forEach(a => drawAsteroid(ctx, a));
  }, [asteroids, gameClock]);

  const buttons: { label: WeaponType; color: string }[] = useMemo(
    () => [
      { label: 'Phasers', color: WEAPON_COLORS.Phasers },
      { label: 'Missiles', color: WEAPON_COLORS.Missiles },
      { label: 'Railgun', color: WEAPON_COLORS.Railgun }
    ],
    []
  );

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
          const disabled = readyIn > 0;
          const cooldownProgress = disabled ? 1 - (readyIn / 3) : 1; // Assuming max cooldown is 3 seconds
          
          return (
            <button
              key={btn.label}
              onClick={() => fireWeapon(btn.label)}
              className={`px-4 py-2 rounded font-mono text-white relative overflow-hidden transition-all ${
                disabled ? 'opacity-60 cursor-not-allowed' : 'hover:brightness-110'
              }`}
              style={{ backgroundColor: btn.color }}
              disabled={disabled}
              title={disabled ? `Cooldown ${readyIn}s` : btn.label}
            >
              {/* Cooldown progress bar overlay */}
              {disabled && (
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
    </div>
  );
};

