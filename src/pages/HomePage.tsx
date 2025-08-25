import React, { useRef } from 'react';
import { useDispatch } from 'react-redux';
import { setCurrentPlayer, setCurrentPage } from '../store/gameStore';
import { resetNavigation } from '../store/stations/navigationStore';
import { initializeForPlayer } from '../store/stations/engineeringStore';
import { RocketAnimation } from '../components/RocketAnimation';
import { Player, Players } from '../types';

export const HomePage: React.FC = () => {
  const dispatch = useDispatch();
  const rocketCanvasRef = useRef<HTMLCanvasElement>(null);

  const handlePlayerSelect = (player: Player) => {
    dispatch(setCurrentPlayer(player));
    dispatch(resetNavigation({ player }));
    dispatch(initializeForPlayer(player));
    dispatch(setCurrentPage('play'));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-blue-900 to-gray-900 flex flex-col items-center justify-center p-8">
      {/* Game Title */}
      <h1 className="text-6xl font-bold text-center mb-12 bg-gradient-to-r from-blue-400 via-purple-500 to-blue-600 bg-clip-text text-transparent">
        STARSHIP COMMAND
      </h1>

      {/* Rocket Animation */}
      <div className="mb-12">
        <canvas
          ref={rocketCanvasRef}
          width={400}
          height={200}
          className="mx-auto"
        />
        <RocketAnimation canvasRef={rocketCanvasRef} size="large" showTrail={true} />
      </div>

      {/* Player Selection */}
      <div className="flex space-x-8">
        <button
          onClick={() => handlePlayerSelect(Players.PLAYER_ONE)}
          className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 
                   border border-blue-500 rounded-lg text-white font-semibold text-xl
                   shadow-lg hover:shadow-blue-500/25 transition-all duration-300
                   hover:scale-105 active:scale-95"
        >
          <div className="flex flex-col items-center">
            <span className="text-2xl mb-1">🚀</span>
            <span>GOBI</span>
            <span className="text-sm opacity-75">Engineer • Weapons</span>
          </div>
        </button>

        <button
          onClick={() => handlePlayerSelect(Players.PLAYER_TWO)}
          className="px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 
                   border border-purple-500 rounded-lg text-white font-semibold text-xl
                   shadow-lg hover:shadow-purple-500/25 transition-all duration-300
                   hover:scale-105 active:scale-95"
        >
          <div className="flex flex-col items-center">
            <span className="text-2xl mb-1">🧭</span>
            <span>BEN</span>
            <span className="text-sm opacity-75">Navigation • Science</span>
          </div>
        </button>
      </div>

      {/* Background stars */}
      <div className="fixed inset-0 pointer-events-none">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>
    </div>
  );
};