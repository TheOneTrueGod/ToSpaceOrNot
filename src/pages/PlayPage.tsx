import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { StatusMonitor } from '../components/StatusMonitor';
import { ShipManual } from '../components/ShipManual';
import { Stations } from '../components/Stations';
import { dungeonMaster } from '../systems/DungeonMaster';

export const PlayPage: React.FC = () => {
  const currentPlayer = useSelector((state: RootState) => state.game.currentPlayer);

  useEffect(() => {
    // Start the dungeon master when the play page loads
    dungeonMaster.start();

    return () => {
      // Clean up when leaving the page
      dungeonMaster.stop();
    };
  }, []);

  if (!currentPlayer) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4 overflow-auto h-screen">
      <div className="grid grid-cols-12 gap-4 h-full">
        {/* Left Column */}
        <div className="col-span-4 grid grid-rows-2 gap-4">
          {/* Status Monitor */}
          <div className="row-span-1">
            <StatusMonitor />
          </div>
          
          {/* Ship Manual */}
          <div className="row-span-1">
            <ShipManual />
          </div>
        </div>

        {/* Right Column - Stations */}
        <div className="col-span-8">
          <Stations />
        </div>
      </div>

      {/* Player indicator */}
      <div className="fixed top-4 right-4 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2">
        <div className="text-white font-semibold">
          Player: <span className={currentPlayer === 'Gobi' ? 'text-blue-400' : 'text-purple-400'}>
            {currentPlayer}
          </span>
        </div>
      </div>
    </div>
  );
};