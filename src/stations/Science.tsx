import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store";
import { Players } from "../types";
import {
  recordPulseClick,
  transferFuel,
  dumpTopLayer,
  dumpAllLayers,
  checkAndProcessCorrectMixture,
  startRefuel,
  completeRefuel,
  updateCorrectMixtures,
  isPulseFrequencyCorrect,
  getMixtureLength,
  FUEL_COLORS,
  FUEL_ADDED_PER_CORRECT_MIXTURE,
  PULSE_FREQUENCY_ENABLED,
  FuelType,
	getFuelCooldowns,
	FUEL_TARGET_TIMEOUT,
} from "../store/stations/scienceStore";
import { getFuelPenaltyMultiplier } from "../store/stations/engineeringStore";
import { updateSystemValue } from "../store/shipStore";
import { ButtonWithProgressBar } from "../components/ButtonWithProgressBar";
import { StationTitle } from "../components/StationTitle";
import { AlertTriangle, AlertCircle, AlertOctagon } from 'lucide-react';

const PulseButton: React.FC = () => {
  const dispatch = useDispatch();
  const scienceState = useSelector((state: RootState) => state.science);
  const [isPulsing, setIsPulsing] = useState(false);
  const pulseIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isCorrect = isPulseFrequencyCorrect(scienceState);

  useEffect(() => {
    if (pulseIntervalRef.current) {
      clearInterval(pulseIntervalRef.current);
    }

    pulseIntervalRef.current = setInterval(() => {
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 200);
    }, scienceState.pulseFrequency.current);

    return () => {
      if (pulseIntervalRef.current) {
        clearInterval(pulseIntervalRef.current);
      }
    };
  }, [scienceState.pulseFrequency.current]);

  const handleClick = () => {
    dispatch(recordPulseClick(Date.now()));
  };

  return (
    <div className="flex items-center space-x-4">
      <button
        onClick={handleClick}
        className={`w-24 h-24 rounded-full bg-teal-500 transition-all duration-200 ${
          isPulsing
            ? "shadow-[0_0_30px_10px_rgba(20,184,166,0.8)]"
            : "shadow-[0_0_15px_5px_rgba(20,184,166,0.4)]"
        } hover:shadow-[0_0_25px_8px_rgba(20,184,166,0.6)]`}
      />
      <div
        className={`w-4 h-4 rounded-full ${
          isCorrect ? "bg-green-500" : "bg-red-500 animate-pulse"
        }`}
      />
    </div>
  );
};

interface TestTubeProps {
  layers: FuelType[];
  maxLayers?: number;
  onClick?: () => void;
  isActive?: boolean;
  label?: string;
  scale?: number;
}

const TestTubeComponent: React.FC<TestTubeProps> = ({
  layers,
  maxLayers = 5,
  onClick,
  isActive = false,
  label,
  scale = 1,
}) => {
  const emptyLayers = Math.max(0, maxLayers - layers.length);
  const width = 48 * scale;
  const height = 160 * scale;
  const layerHeight = maxLayers > 0 ? height / maxLayers : 32 * scale;

  return (
    <div className="flex flex-col items-center">
      {label && (
        <span className="text-xs text-gray-400 mb-1 font-mono">{label}</span>
      )}
      <div
        onClick={onClick}
        className={`relative bg-gray-700 border-2 ${
          isActive ? "border-teal-400" : "border-gray-500"
        } rounded-b-full overflow-hidden ${
          onClick ? "cursor-pointer hover:border-gray-400" : ""
        }`}
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        <div className="absolute bottom-0 w-full flex flex-col-reverse">
          {layers.map((fuel, index) => (
            <div
              key={index}
              className="w-full border-t border-gray-600"
              style={{
                backgroundColor: FUEL_COLORS[fuel],
                height: `${layerHeight}px`,
              }}
            />
          ))}
        </div>
        {emptyLayers > 0 && (
          <div className="absolute top-0 w-full">
            {Array.from({ length: emptyLayers }).map((_, index) => (
              <div key={index} style={{ height: `${layerHeight}px` }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const FuelMixingGame: React.FC = () => {
  const dispatch = useDispatch();
  const scienceState = useSelector((state: RootState) => state.science);
  const gameClock = useSelector((state: RootState) => state.ship.gameClock);
  const shipState = useSelector((state: RootState) => state.ship);
  const engineeringState = useSelector((state: RootState) => state.engineering);
  const currentPlayer = useSelector(
    (state: RootState) => state.game.currentPlayer
  );
  const [animatingTransfer, setAnimatingTransfer] = useState<{
    from: number;
    to: "active";
  } | null>(null);
  
  // Calculate fuel penalty from engineering state
  const fuelPenalty = engineeringState 
    ? getFuelPenaltyMultiplier(engineeringState, currentPlayer || Players.PLAYER_ONE)
    : 1;
  
	const { refuel: adjustedRefuelCooldown, dump: adjustedDumpCooldown, dumpAll: adjustedDumpAllCooldown } = getFuelCooldowns(fuelPenalty);
  
  // Determine alert levels based on penalty multipliers (matching AutomaticAlertSystem logic)
  const getAlertSeverity = (penalty: number): 'Warning' | 'Danger' | 'Critical' | null => {
    if (penalty >= 5.0) return 'Critical';
    if (penalty >= 2.0) return 'Danger';
    if (penalty >= 1.5) return 'Warning';
    return null;
  };

  const fuelAlertSeverity = getAlertSeverity(fuelPenalty);

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

  const getAlertMessage = (severity: 'Warning' | 'Danger' | 'Critical', penalty: number): string => {
    const increase = Math.round((penalty - 1) * 100);
    switch (severity) {
      case 'Critical':
        return `Fuel System Critical: Cooldowns increased by ${increase}%`;
      case 'Danger':
        return `Fuel System Error: Cooldowns increased by ${increase}%`;
      default:
        return `Fuel Wiring Error: Cooldowns increased by ${increase}%`;
    }
  };

  // Calculate distance traveled and required mixture length
  const distanceTraveled =
    shipState.distanceToDestination.max -
    shipState.distanceToDestination.current;
  const requiredMixtureLength = getMixtureLength(distanceTraveled);

  const currentGameSeconds = gameClock.minutes * 60 + gameClock.seconds;
  const isRefuelOnCooldown =
    currentGameSeconds < scienceState.fuelMixture.refuelCooldownUntil;
  const refuelCooldownRemaining = Math.max(
    0,
    scienceState.fuelMixture.refuelCooldownUntil - currentGameSeconds
  );
  const isDumpOnCooldown =
    currentGameSeconds < scienceState.fuelMixture.dumpCooldownUntil;
  const dumpCooldownRemaining = Math.max(
    0,
    scienceState.fuelMixture.dumpCooldownUntil - currentGameSeconds
  );
  const isDumpAllOnCooldown =
    currentGameSeconds < scienceState.fuelMixture.dumpAllCooldownUntil;
  const dumpAllCooldownRemaining = Math.max(
    0,
    scienceState.fuelMixture.dumpAllCooldownUntil - currentGameSeconds
  );

  // Calculate countdown to next mixture change based on Unix timestamp
  const now = Date.now() / 1000; // Convert to seconds
  const currentPeriod = Math.floor(now / FUEL_TARGET_TIMEOUT) * FUEL_TARGET_TIMEOUT; // Round down to nearest 20-second period
  const nextPeriod = currentPeriod + FUEL_TARGET_TIMEOUT;
  const secondsUntilNextChange = Math.ceil(nextPeriod - now);

  useEffect(() => {
    dispatch(
      updateCorrectMixtures({
        currentGameSeconds,
        mixtureLength: requiredMixtureLength,
      })
    );
  }, [currentGameSeconds, requiredMixtureLength, dispatch]);

  useEffect(() => {
    if (
      scienceState.fuelMixture.activeTube.layers.length !==
      requiredMixtureLength
    )
      return;

    // Get both current and previous target mixtures for forgiveness
    const currentTargetMixture =
      currentPlayer === Players.PLAYER_ONE
        ? scienceState.fuelMixture.correctMixture.ownShip
        : scienceState.fuelMixture.correctMixture.otherShip;

    const previousTargetMixture =
      currentPlayer === Players.PLAYER_ONE
        ? scienceState.fuelMixture.previousCorrectMixture.ownShip
        : scienceState.fuelMixture.previousCorrectMixture.otherShip;

    // Check if it matches either current or previous mixture
    const matchesCurrent = scienceState.fuelMixture.activeTube.layers.every(
      (fuel, index) => fuel === currentTargetMixture[index]
    );
    const matchesPrevious = scienceState.fuelMixture.activeTube.layers.every(
      (fuel, index) => fuel === previousTargetMixture[index]
    );

    if (matchesCurrent || matchesPrevious) {
      dispatch(
        checkAndProcessCorrectMixture({
          currentPlayer: currentPlayer || Players.PLAYER_ONE,
          currentGameSeconds,
          requiredLength: requiredMixtureLength,
        })
      );

      dispatch(
        updateSystemValue({
          system: "fuelLevels",
          value: FUEL_ADDED_PER_CORRECT_MIXTURE,
          isCurrentValue: true,
        })
      );
    }
  }, [
    scienceState.fuelMixture.activeTube.layers,
    scienceState.fuelMixture.correctMixture,
    scienceState.fuelMixture.previousCorrectMixture,
    currentPlayer,
    currentGameSeconds,
    requiredMixtureLength,
    dispatch,
  ]);

  const handleTubeClick = (index: number) => {
    if (animatingTransfer) return;
    if (scienceState.fuelMixture.storageTubes[index].layers.length === 0)
      return;
    if (
      scienceState.fuelMixture.activeTube.layers.length >= requiredMixtureLength
    )
      return;

    setAnimatingTransfer({ from: index, to: "active" });
    dispatch(
      transferFuel({ tubeIndex: index, maxLayers: requiredMixtureLength })
    );

    setTimeout(() => {
      setAnimatingTransfer(null);
    }, 300);
  };

  const handleDump = () => {
    if (
      !isDumpOnCooldown &&
      scienceState.fuelMixture.activeTube.layers.length > 0
    ) {
      dispatch(dumpTopLayer({ currentGameSeconds, fuelPenalty }));
    }
  };

  const handleDumpAll = () => {
    if (
      !isDumpAllOnCooldown &&
      scienceState.fuelMixture.activeTube.layers.length > 0
    ) {
      dispatch(dumpAllLayers({ currentGameSeconds, fuelPenalty }));
    }
  };

  const handleRefuel = () => {
    if (!isRefuelOnCooldown) {
      dispatch(startRefuel({ currentGameSeconds, fuelPenalty }));
    }
  };

  // Check if cooldown has expired and complete refuel
  useEffect(() => {
    if (
      scienceState.fuelMixture.refuelCooldownUntil > 0 &&
      currentGameSeconds >= scienceState.fuelMixture.refuelCooldownUntil &&
      scienceState.fuelMixture.storageTubes.every(
        (tube) => tube.layers.length === 0
      )
    ) {
      dispatch(completeRefuel());
    }
  }, [
    currentGameSeconds,
    scienceState.fuelMixture.refuelCooldownUntil,
    scienceState.fuelMixture.storageTubes,
    dispatch,
  ]);

  const correctMixture =
    currentPlayer === Players.PLAYER_ONE
      ? scienceState.fuelMixture.correctMixture.otherShip.slice(
          0,
          requiredMixtureLength
        )
      : scienceState.fuelMixture.correctMixture.ownShip.slice(
          0,
          requiredMixtureLength
        );

  const previousCorrectMixture =
    currentPlayer === Players.PLAYER_ONE
      ? scienceState.fuelMixture.previousCorrectMixture.otherShip.slice(
          0,
          requiredMixtureLength
        )
      : scienceState.fuelMixture.previousCorrectMixture.ownShip.slice(
          0,
          requiredMixtureLength
        );

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div>
          <h3 className="text-sm font-mono text-gray-400 mb-2 text-center">
            Storage Tubes
          </h3>
          <div className="flex space-x-4">
            {scienceState.fuelMixture.storageTubes.map((tube, index) => (
              <TestTubeComponent
                key={index}
                layers={tube.layers}
                onClick={() => handleTubeClick(index)}
              />
            ))}
          </div>
          <div className="flex justify-center mt-4">
            <div className="flex flex-col items-center">
              <ButtonWithProgressBar
                onClick={handleRefuel}
                disabled={isRefuelOnCooldown}
                label="Restock"
                cooldownRemaining={refuelCooldownRemaining}
                maxCooldown={adjustedRefuelCooldown}
                baseColor="bg-blue-600 hover:bg-blue-700"
                showCooldownInLabel={false}
              />
              <span className="text-sky-400 text-sm font-mono mt-1">
                {isRefuelOnCooldown ? `${refuelCooldownRemaining}s` : `${adjustedRefuelCooldown}s delay`}
              </span>
            </div>
          </div>
        </div>

        <div className="flex space-x-4">
          <div>
            <h3 className="text-sm font-mono text-gray-400 mb-2 text-center">
              Active Mixture
            </h3>
            <TestTubeComponent
              layers={scienceState.fuelMixture.activeTube.layers}
              maxLayers={requiredMixtureLength}
              isActive={true}
            />
          </div>

          <div className="flex flex-col h-full gap-4">
            <div className="flex flex-col items-center mt-auto">
              <ButtonWithProgressBar
                onClick={handleDump}
                disabled={
                  isDumpOnCooldown ||
                  scienceState.fuelMixture.activeTube.layers.length === 0
                }
                label="Dump one"
                cooldownRemaining={dumpCooldownRemaining}
                maxCooldown={adjustedDumpCooldown}
                baseColor="bg-orange-600 hover:bg-orange-700"
                showCooldownInLabel={false}
              />
              <span className="text-sky-400 text-sm font-mono mt-1">
                {isDumpOnCooldown ? `${dumpCooldownRemaining}s` : `${adjustedDumpCooldown}s cooldown`}
              </span>
            </div>

            <div className="flex flex-col items-center mb-auto pt-4">
              <ButtonWithProgressBar
                onClick={handleDumpAll}
                disabled={
                  isDumpAllOnCooldown ||
                  scienceState.fuelMixture.activeTube.layers.length === 0
                }
                label="Dump all"
                cooldownRemaining={dumpAllCooldownRemaining}
                maxCooldown={adjustedDumpAllCooldown}
                baseColor="bg-red-600 hover:bg-red-700"
                showCooldownInLabel={false}
              />
              <span className="text-sky-400 text-sm font-mono mt-1">
                {isDumpAllOnCooldown ? `${dumpAllCooldownRemaining}s` : `${adjustedDumpAllCooldown}s cooldown`}
              </span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-mono text-gray-400 mb-2 text-center">
            {currentPlayer === Players.PLAYER_ONE ? "Kestrel's" : "Albatross's"} Target
          </h3>
          <div className="flex items-center gap-2">
            <div>
              <TestTubeComponent
                layers={correctMixture}
                maxLayers={requiredMixtureLength}
                isActive={false}
                label="Current"
              />
            </div>
            <div className="opacity-60">
              <TestTubeComponent
                layers={previousCorrectMixture}
                maxLayers={requiredMixtureLength}
                isActive={false}
                label="Previous"
                scale={0.5}
              />
            </div>
          </div>
          <div className="text-center mt-2">
            <p className="text-xs font-mono text-teal-400">
              Next: {secondsUntilNextChange}s
            </p>
            <p className="text-xs font-mono text-gray-400">
              SyncId: {scienceState.fuelMixture.changeCount}
            </p>
          </div>
        </div>
      </div>
      
      {/* Alerts Section */}
      <div className="mt-4 space-y-2">
        {fuelAlertSeverity && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded border ${getAlertColor(fuelAlertSeverity)}`}>
            {getAlertIcon(fuelAlertSeverity)}
            <span className="font-mono text-sm">
              {getAlertMessage(fuelAlertSeverity, fuelPenalty)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export const Science: React.FC = () => {
  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-gray-800 rounded-lg">
      <StationTitle>Science Station - Reactor Control</StationTitle>

      <div className="space-y-8">
        <div className="bg-gray-700 p-6 rounded-lg">
          <h3 className="text-lg font-mono text-teal-400 mb-4">
            Fuel Mixture Control
          </h3>
          <FuelMixingGame />
          <p className="text-xs text-gray-400 text-center mt-4">
            Click storage tubes to transfer fuel. Match either the target
            mixture, or the previous mixture to add fuel to the ship.
          </p>
        </div>

        {PULSE_FREQUENCY_ENABLED && (
          <div className="bg-gray-700 p-6 rounded-lg">
            <h3 className="text-lg font-mono text-teal-400 mb-4">
              Pulse Frequency Control
            </h3>
            <div className="flex justify-center">
              <PulseButton />
            </div>
            <p className="text-xs text-gray-400 text-center mt-4">
              Click the button to match the reactor pulse frequency
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
