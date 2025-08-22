import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { RocketAnimation } from './RocketAnimation';
import { ChevronUp, ChevronDown } from 'lucide-react';

export const StatusMonitor: React.FC = () => {
  const shipState = useSelector((state: RootState) => state.ship);

  const renderProgressBar = (
    label: string,
    current: number,
    max: number,
    color: string = 'blue',
    showChanges: { direction: 'increasing' | 'decreasing' | 'stable'; intensity: number } = { direction: 'stable', intensity: 0 }
  ) => {
    const percentage = Math.max(0, Math.min(100, (current / max) * 100));
    
    const getColorClasses = (color: string) => {
      switch (color) {
        case 'red': return 'bg-red-500';
        case 'green': return 'bg-green-500';
        case 'yellow': return 'bg-yellow-500';
        default: return 'bg-blue-500';
      }
    };

    const chevrons = Array.from({ length: showChanges.intensity }, (_, i) => (
      showChanges.direction === 'increasing' ? 
        <ChevronUp key={i} size={8} className="text-green-400" /> :
        <ChevronDown key={i} size={8} className="text-red-400" />
    ));

    return (
      <div className="flex flex-col items-center space-y-1">
        <div className="text-xs text-gray-300 font-mono">{label}</div>
        <div className="relative w-6 h-20 bg-gray-700 rounded border border-gray-600">
          <div 
            className={`absolute bottom-0 w-full rounded transition-all duration-300 ${getColorClasses(color)}`}
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
      case 'Critical': return 'text-red-400 bg-red-900/20 border-red-500';
      case 'Danger': return 'text-orange-400 bg-orange-900/20 border-orange-500';
      case 'Warning': return 'text-yellow-400 bg-yellow-900/20 border-yellow-500';
      default: return 'text-gray-400 bg-gray-900/20 border-gray-500';
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 h-full relative">
      {/* Alert Overlay */}
      <div className="absolute top-4 left-4 space-y-2 z-10 max-w-64">
        {shipState.alerts.slice(0, 4).map((alert) => (
          <div 
            key={alert.id}
            className={`p-2 rounded border backdrop-blur-sm ${getSeverityColor(alert.severity)}`}
          >
            <div className="font-semibold text-sm">{alert.name}</div>
            <div className="text-xs opacity-80">
              {alert.timestamp.minutes.toString().padStart(2, '0')}:
              {alert.timestamp.seconds.toString().padStart(2, '0')}
            </div>
          </div>
        ))}
      </div>

      {/* Rocket Animation */}
      <div className="flex justify-center mb-4 mt-8">
        <RocketAnimation size="small" showTrail={true} />
      </div>

      {/* Status Bar */}
      <div className="bg-gray-800 border border-gray-600 rounded p-3">
        <div className="flex items-center justify-between">
          {/* Game Clock */}
          <div className="text-green-400 font-mono text-lg">
            {shipState.gameClock.minutes.toString().padStart(2, '0')}:
            {shipState.gameClock.seconds.toString().padStart(2, '0')}
          </div>

          {/* Progress Bars */}
          <div className="flex space-x-4">
            {renderProgressBar(
              'HULL', 
              shipState.hullDamage.max - shipState.hullDamage.current, 
              shipState.hullDamage.max, 
              shipState.hullDamage.current > 50 ? 'red' : shipState.hullDamage.current > 25 ? 'yellow' : 'green'
            )}
            {renderProgressBar(
              'O2', 
              shipState.oxygenLevels.current, 
              shipState.oxygenLevels.max, 
              shipState.oxygenLevels.current < 30 ? 'red' : shipState.oxygenLevels.current < 60 ? 'yellow' : 'green'
            )}
            {renderProgressBar(
              'FUEL', 
              shipState.fuelLevels.current, 
              shipState.fuelLevels.max, 
              shipState.fuelLevels.current < 25 ? 'red' : shipState.fuelLevels.current < 50 ? 'yellow' : 'blue'
            )}
            {renderProgressBar(
              'PWR', 
              shipState.batteryPower.current, 
              shipState.batteryPower.max, 
              shipState.batteryPower.current < 20 ? 'red' : shipState.batteryPower.current < 40 ? 'yellow' : 'blue'
            )}
          </div>
        </div>
      </div>

      {/* Distance Progress Bar */}
      <div className="mt-3 bg-gray-800 border border-gray-600 rounded p-3">
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs text-gray-400 font-mono">
            <span>Distance Traveled</span>
            <span>{shipState.distanceToDestination.max - shipState.distanceToDestination.current} / {shipState.distanceToDestination.max} km</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2.5 border border-gray-600">
            <div 
              className="bg-gradient-to-r from-blue-600 to-blue-400 h-2.5 rounded-full transition-all duration-500"
              style={{ 
                width: `${Math.max(0, Math.min(100, ((shipState.distanceToDestination.max - shipState.distanceToDestination.current) / shipState.distanceToDestination.max) * 100))}%` 
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};