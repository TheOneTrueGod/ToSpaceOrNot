import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import {
  recordPulseClick,
  transferFuel,
  dumpTopLayer,
  checkAndProcessCorrectMixture,
  startRefuel,
  completeRefuel,
  updateCorrectMixtures,
  isPulseFrequencyCorrect,
  FUEL_COLORS,
  FUEL_ADDED_PER_CORRECT_MIXTURE,
  REFUEL_COOLDOWN_SECONDS,
  DUMP_COOLDOWN_SECONDS,
  FuelType
} from '../store/stations/scienceStore';
import { updateSystemValue } from '../store/shipStore';

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
          isPulsing ? 'shadow-[0_0_30px_10px_rgba(20,184,166,0.8)]' : 'shadow-[0_0_15px_5px_rgba(20,184,166,0.4)]'
        } hover:shadow-[0_0_25px_8px_rgba(20,184,166,0.6)]`}
      />
      <div className={`w-4 h-4 rounded-full ${
        isCorrect ? 'bg-green-500' : 'bg-red-500 animate-pulse'
      }`} />
    </div>
  );
};

interface TestTubeProps {
  layers: FuelType[];
  maxLayers?: number;
  onClick?: () => void;
  isActive?: boolean;
  label?: string;
}

const TestTubeComponent: React.FC<TestTubeProps> = ({
  layers,
  maxLayers = 5,
  onClick,
  isActive = false,
  label
}) => {
  const emptyLayers = maxLayers - layers.length;
  
  return (
    <div className="flex flex-col items-center">
      {label && (
        <span className="text-xs text-gray-400 mb-1 font-mono">{label}</span>
      )}
      <div
        onClick={onClick}
        className={`relative w-12 h-40 bg-gray-700 border-2 ${
          isActive ? 'border-teal-400' : 'border-gray-500'
        } rounded-b-full overflow-hidden ${
          onClick ? 'cursor-pointer hover:border-gray-400' : ''
        }`}
      >
        <div className="absolute bottom-0 w-full flex flex-col-reverse">
          {layers.map((fuel, index) => (
            <div
              key={index}
              className="w-full h-8 border-t border-gray-600"
              style={{ backgroundColor: FUEL_COLORS[fuel] }}
            />
          ))}
        </div>
        {emptyLayers > 0 && (
          <div className="absolute top-0 w-full">
            {Array.from({ length: emptyLayers }).map((_, index) => (
              <div key={index} className="w-full h-8" />
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
  const currentPlayer = useSelector((state: RootState) => state.game.currentPlayer);
  const [animatingTransfer, setAnimatingTransfer] = useState<{ from: number, to: 'active' } | null>(null);
  
  const currentGameSeconds = gameClock.minutes * 60 + gameClock.seconds;
  const isRefuelOnCooldown = currentGameSeconds < scienceState.fuelMixture.refuelCooldownUntil;
  const refuelCooldownRemaining = Math.max(0, scienceState.fuelMixture.refuelCooldownUntil - currentGameSeconds);
  const isDumpOnCooldown = currentGameSeconds < scienceState.fuelMixture.dumpCooldownUntil;
  const dumpCooldownRemaining = Math.max(0, scienceState.fuelMixture.dumpCooldownUntil - currentGameSeconds);
  
  // Calculate countdown to next mixture change
  const secondsUntilNextChange = 20 - (currentGameSeconds - scienceState.fuelMixture.lastChangeTime);
  
  useEffect(() => {
    dispatch(updateCorrectMixtures({ currentGameSeconds }));
  }, [currentGameSeconds, dispatch]);
  
  useEffect(() => {
    if (scienceState.fuelMixture.activeTube.layers.length !== 5) return;
    
    const targetMixture = currentPlayer === 'Gobi' 
      ? scienceState.fuelMixture.correctMixture.ownShip 
      : scienceState.fuelMixture.correctMixture.otherShip;
    
    const isCorrect = scienceState.fuelMixture.activeTube.layers.every(
      (fuel, index) => fuel === targetMixture[index]
    );
    
    if (isCorrect) {
      dispatch(checkAndProcessCorrectMixture({ 
        currentPlayer: currentPlayer || 'Gobi',
        currentGameSeconds 
      }));
      
      dispatch(updateSystemValue({
        system: 'fuelLevels',
        value: FUEL_ADDED_PER_CORRECT_MIXTURE,
        isCurrentValue: true
      }));
    }
  }, [scienceState.fuelMixture.activeTube.layers, scienceState.fuelMixture.correctMixture, currentPlayer, currentGameSeconds, dispatch]);
  
  const handleTubeClick = (index: number) => {
    if (animatingTransfer) return;
    if (scienceState.fuelMixture.storageTubes[index].layers.length === 0) return;
    if (scienceState.fuelMixture.activeTube.layers.length >= 5) return;
    
    setAnimatingTransfer({ from: index, to: 'active' });
    dispatch(transferFuel(index));
    
    setTimeout(() => {
      setAnimatingTransfer(null);
    }, 300);
  };
  
  const handleDump = () => {
    if (!isDumpOnCooldown && scienceState.fuelMixture.activeTube.layers.length > 0) {
      dispatch(dumpTopLayer(currentGameSeconds));
    }
  };
  
  const handleRefuel = () => {
    if (!isRefuelOnCooldown) {
      dispatch(startRefuel(currentGameSeconds));
    }
  };
  
  // Check if cooldown has expired and complete refuel
  useEffect(() => {
    if (scienceState.fuelMixture.refuelCooldownUntil > 0 && 
        currentGameSeconds >= scienceState.fuelMixture.refuelCooldownUntil &&
        scienceState.fuelMixture.storageTubes.every(tube => tube.layers.length === 0)) {
      dispatch(completeRefuel());
    }
  }, [currentGameSeconds, scienceState.fuelMixture.refuelCooldownUntil, scienceState.fuelMixture.storageTubes, dispatch]);
  
  const correctMixture = currentPlayer === 'Gobi' 
    ? scienceState.fuelMixture.correctMixture.otherShip
    : scienceState.fuelMixture.correctMixture.ownShip;
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div>
          <h3 className="text-sm font-mono text-gray-400 mb-2 text-center">Storage Tubes</h3>
          <div className="flex space-x-4">
            {scienceState.fuelMixture.storageTubes.map((tube, index) => (
              <TestTubeComponent
                key={index}
                layers={tube.layers}
                onClick={() => handleTubeClick(index)}
              />
            ))}
          </div>
        </div>
        
        <div className="flex space-x-4">
          <div>
            <h3 className="text-sm font-mono text-gray-400 mb-2 text-center">Active Mixture</h3>
            <TestTubeComponent
              layers={scienceState.fuelMixture.activeTube.layers}
              isActive={true}
            />
          </div>
          
          <div className="flex flex-col space-y-2">
            <button
              onClick={handleDump}
              disabled={isDumpOnCooldown || scienceState.fuelMixture.activeTube.layers.length === 0}
              className={`px-4 py-2 rounded font-mono text-sm ${
                isDumpOnCooldown || scienceState.fuelMixture.activeTube.layers.length === 0
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {isDumpOnCooldown ? `Dump (${dumpCooldownRemaining}s)` : 'Dump'}
            </button>
            
            <button
              onClick={handleRefuel}
              disabled={isRefuelOnCooldown}
              className={`px-4 py-2 rounded font-mono text-sm ${
                isRefuelOnCooldown
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isRefuelOnCooldown ? `Refuel (${refuelCooldownRemaining}s)` : 'Refuel'}
            </button>
          </div>
        </div>
        
        <div>
          <h3 className="text-sm font-mono text-gray-400 mb-2 text-center">
            {currentPlayer === 'Gobi' ? "Ben's" : "Gobi's"} Target
          </h3>
          <TestTubeComponent
            layers={correctMixture}
            isActive={false}
          />
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
    </div>
  );
};

export const Science: React.FC = () => {
  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-gray-800 rounded-lg">
      <h2 className="text-2xl font-mono text-white text-center mb-8">Science Station - Reactor Control</h2>
      
      <div className="space-y-8">
        <div className="bg-gray-700 p-6 rounded-lg">
          <h3 className="text-lg font-mono text-teal-400 mb-4">Fuel Mixture Control</h3>
          <FuelMixingGame />
          <p className="text-xs text-gray-400 text-center mt-4">
            Click storage tubes to transfer fuel. Match the target mixture to add fuel to the ship.
          </p>
        </div>
        
        <div className="bg-gray-700 p-6 rounded-lg">
          <h3 className="text-lg font-mono text-teal-400 mb-4">Pulse Frequency Control</h3>
          <div className="flex justify-center">
            <PulseButton />
          </div>
          <p className="text-xs text-gray-400 text-center mt-4">
            Click the button to match the reactor pulse frequency
          </p>
        </div>
      </div>
    </div>
  );
};