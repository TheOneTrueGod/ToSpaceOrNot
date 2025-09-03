import React, { useRef, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import { RocketAnimation } from "./RocketAnimation";
import {
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  AlertCircle,
  XCircle,
  CheckCircle,
} from "lucide-react";
import { disasterEventBus } from "../systems/DisasterEventBus";

// Constants for asteroid rendering
const ASTEROID_MIN_SIZE = 10;
const ASTEROID_MAX_SIZE = 20;

export const StatusMonitor: React.FC = () => {
  const shipState = useSelector((state: RootState) => state.ship);
  const weaponsState = useSelector((state: RootState) => state.weapons);
  const rocketCanvasRef = useRef<HTMLCanvasElement>(null);
  const asteroidCanvasRef = useRef<HTMLCanvasElement>(null);
  const asteroidAnglesRef = useRef<Map<string, number>>(new Map());
  const [disasterAnimation, setDisasterAnimation] = useState<
    "slide" | "shake" | null
  >(null);

  // Subscribe to disaster events
  useEffect(() => {
    const unsubscribe = disasterEventBus.subscribe((animation) => {
      setDisasterAnimation(animation);
      // Clear animation after it completes
      setTimeout(
        () => setDisasterAnimation(null),
        animation === "slide" ? 1000 : 500
      );
    });

    return unsubscribe;
  }, []);

  const renderProgressBar = (
    label: string,
    current: number,
    max: number,
    color: string = "blue",
    showChanges: {
      direction: "increasing" | "decreasing" | "stable";
      intensity: number;
    } = { direction: "stable", intensity: 0 }
  ) => {
    const percentage = Math.max(0, Math.min(100, (current / max) * 100));

    const getColorClasses = (color: string) => {
      switch (color) {
        case "red":
          return "bg-red-500";
        case "green":
          return "bg-green-500";
        case "yellow":
          return "bg-yellow-500";
        default:
          return "bg-blue-500";
      }
    };

    const chevrons = Array.from({ length: showChanges.intensity }, (_, i) =>
      showChanges.direction === "increasing" ? (
        <ChevronUp key={i} size={8} className="text-green-400" />
      ) : (
        <ChevronDown key={i} size={8} className="text-red-400" />
      )
    );

    return (
      <div className="flex flex-col items-center space-y-1">
        <div className="text-xs text-gray-300 font-mono">{label}</div>
        <div className="relative w-6 h-20 bg-gray-700 rounded border border-gray-600">
          <div
            className={`absolute bottom-0 w-full rounded transition-all duration-300 ${getColorClasses(
              color
            )}`}
            style={{ height: `${percentage}%` }}
          />
          <div className="absolute inset-0 flex flex-col justify-center items-center">
            {chevrons}
          </div>
        </div>
        <div className="text-xs text-gray-400 font-mono">
          {Math.round(current)}/{max}
        </div>
      </div>
    );
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "Critical":
        return "text-red-400 bg-red-900/20 border-red-500";
      case "Danger":
        return "text-orange-400 bg-orange-900/20 border-orange-500";
      case "Warning":
        return "text-yellow-400 bg-yellow-900/20 border-yellow-500";
      case "Success":
        return "text-green-400 bg-green-900/20 border-green-500";
      default:
        return "text-gray-400 bg-gray-900/20 border-gray-500";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "Critical":
        return <XCircle size={16} className="text-red-400" />;
      case "Danger":
        return <AlertCircle size={16} className="text-orange-400" />;
      case "Warning":
        return <AlertTriangle size={16} className="text-yellow-400" />;
      case "Success":
        return <CheckCircle size={16} className="text-green-400" />;
      default:
        return <AlertCircle size={16} className="text-gray-400" />;
    }
  };

  // Render asteroids on their own canvas
  useEffect(() => {
    const canvas = asteroidCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Assign random angles to new asteroids
    weaponsState.asteroids.forEach((asteroid) => {
      if (!asteroidAnglesRef.current.has(asteroid.id)) {
        // Random angle between -30 and 30 degrees
        asteroidAnglesRef.current.set(
          asteroid.id,
          ((Math.random() - 0.5) * Math.PI) / 5
        );
      }
    });

    // Clean up angles for removed asteroids
    const currentIds = new Set(weaponsState.asteroids.map((a) => a.id));
    Array.from(asteroidAnglesRef.current.keys()).forEach((id) => {
      if (!currentIds.has(id)) {
        asteroidAnglesRef.current.delete(id);
      }
    });

    const drawAsteroids = () => {
      // Clear the entire asteroid canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const nowSeconds =
        shipState.gameClock.minutes * 60 + shipState.gameClock.seconds;
      const shipX = 50; // Ship position (moved left by 50px from center)
      const shipY = canvas.height / 2;

      weaponsState.asteroids.forEach((asteroid) => {
        const impactSeconds =
          asteroid.impactAt.minutes * 60 + asteroid.impactAt.seconds;
        const createdSeconds =
          asteroid.createdAt.minutes * 60 + asteroid.createdAt.seconds;
        const totalTime = impactSeconds - createdSeconds;
        const timeRemaining = impactSeconds - nowSeconds;

        if (timeRemaining <= 0) return; // Don't draw if already impacted

        // Calculate progress (0 = just spawned at right edge, 1 = impact at ship)
        const progress = 1 - timeRemaining / totalTime;

        // Get the angle for this asteroid
        const angle = asteroidAnglesRef.current.get(asteroid.id) || 0;

        // Calculate position along the trajectory
        const startX = canvas.width + 20;
        const startY = shipY + Math.tan(angle) * (startX - shipX);

        // Interpolate position
        const x = startX - (startX - shipX) * progress;
        const y = startY - (startY - shipY) * progress;

        // Scale asteroid size
        const scaledSize =
          ASTEROID_MIN_SIZE +
          ((ASTEROID_MAX_SIZE - ASTEROID_MIN_SIZE) * (asteroid.size - 40)) / 40;
        const currentSize = scaledSize * (1 - progress * 0.3); // Shrink slightly as it approaches

        // Draw asteroid as a simple octagon without material colors
        const sides = 8;
        ctx.fillStyle = "#9ca3af"; // Gray color
        ctx.strokeStyle = "#4b5563"; // Darker gray for outline
        ctx.lineWidth = 1;

        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
          const sideAngle = (i / sides) * Math.PI * 2;
          const px = x + (Math.cos(sideAngle) * currentSize) / 2;
          const py = y + (Math.sin(sideAngle) * currentSize) / 2;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw impact countdown if less than 10 seconds
        if (timeRemaining < 10 && timeRemaining > 0) {
          ctx.fillStyle = "#ef4444";
          ctx.font = "bold 10px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(Math.ceil(timeRemaining).toString(), x, y);
        }
      });
    };

    drawAsteroids();
  }, [weaponsState.asteroids, shipState.gameClock]);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 h-full relative">
      {/* Rocket Animation with overlaid asteroids */}
      <div className="relative flex justify-center mb-4 mt-8">
        <canvas
          ref={rocketCanvasRef}
          width={300}
          height={100}
          className="mx-auto"
        />
        <canvas
          ref={asteroidCanvasRef}
          width={300}
          height={100}
          className="absolute inset-0 mx-auto pointer-events-none"
        />
        <RocketAnimation
          canvasRef={rocketCanvasRef}
          size="small"
          showTrail={true}
          disasterAnimation={disasterAnimation}
        />

        {/* Hull Destroyed overlay */}
        {shipState.hullDamage.current >= shipState.hullDamage.max && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-600 bg-opacity-80 rounded">
            <div className="text-white font-bold text-2xl font-mono tracking-wider">
              HULL DESTROYED
            </div>
          </div>
        )}

        {/* Break overlay */}
        {shipState.isOnBreak && (
          <div className="absolute top-0 left-0 bg-green-500 bg-opacity-20 border-2 border-green-400 rounded px-3 py-1">
            <span className="text-green-400 font-mono text-sm font-semibold">
              Waiting for Navigation Sync
            </span>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="bg-gray-800 border border-gray-600 rounded p-3">
        <div className="flex items-center justify-between">
          {/* Game Clock */}
          <div className="text-green-400 font-mono text-lg">
            {shipState.gameClock.minutes.toString().padStart(2, "0")}:
            {shipState.gameClock.seconds.toString().padStart(2, "0")}
          </div>

          {/* Progress Bars */}
          <div className="flex space-x-4">
            {renderProgressBar(
              "HULL",
              shipState.hullDamage.max - shipState.hullDamage.current,
              shipState.hullDamage.max,
              shipState.hullDamage.current > 50
                ? "red"
                : shipState.hullDamage.current > 25
                ? "yellow"
                : "green"
            )}
            {/*renderProgressBar(
              "O2",
              shipState.oxygenLevels.current,
              shipState.oxygenLevels.max,
              shipState.oxygenLevels.current < 30
                ? "red"
                : shipState.oxygenLevels.current < 60
                ? "yellow"
                : "green"
            )*/}
            {renderProgressBar(
              "FUEL",
              shipState.fuelLevels.current,
              shipState.fuelLevels.max,
              shipState.fuelLevels.current < 25
                ? "red"
                : shipState.fuelLevels.current < 50
                ? "yellow"
                : "blue"
            )}
            {renderProgressBar(
              "PWR",
              shipState.batteryPower.current,
              shipState.batteryPower.max,
              shipState.batteryPower.current < 20
                ? "red"
                : shipState.batteryPower.current < 40
                ? "yellow"
                : "blue"
            )}
          </div>
        </div>
      </div>

      {/* Distance Progress Bar */}
      <div className="mt-3 bg-gray-800 border border-gray-600 rounded p-3">
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs text-gray-400 font-mono">
            <span>Distance Traveled</span>
            <span>
              {Math.floor(
                shipState.distanceToDestination.max -
                  shipState.distanceToDestination.current
              )}{" "}
              / {Math.floor(shipState.distanceToDestination.max)} km
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2.5 border border-gray-600">
            <div
              className="bg-gradient-to-r from-blue-600 to-blue-400 h-2.5 rounded-full transition-all duration-500"
              style={{
                width: `${Math.max(
                  0,
                  Math.min(
                    100,
                    ((shipState.distanceToDestination.max -
                      shipState.distanceToDestination.current) /
                      shipState.distanceToDestination.max) *
                      100
                  )
                )}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      {shipState.alerts.length > 0 && (
        <div className="mt-3 bg-gray-800 border border-gray-600 rounded p-3">
          <div className="grid grid-cols-2 gap-2">
            {shipState.alerts.slice(0, 8).map((alert) => (
              <div
                key={alert.id}
                className={`p-2 rounded border ${getSeverityColor(
                  alert.severity
                )}`}
              >
                <div className="flex items-center space-x-2">
                  {getSeverityIcon(alert.severity)}
                  <div className="font-semibold text-xs">{alert.name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
