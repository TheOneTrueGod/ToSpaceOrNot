import React, { useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { setCurrentPlayer, setCurrentPage } from "../store/gameStore";
import { resetNavigation } from "../store/stations/navigationStore";
import { initializeForPlayer } from "../store/stations/engineeringStore";
import { RocketAnimation } from "../components/RocketAnimation";
import { Player, Players } from "../types";

export const HomePage: React.FC = () => {
  const dispatch = useDispatch();
  const rocketCanvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const handlePlayerSelect = (player: Player) => {
    setSelectedPlayer(player);
    dispatch(setCurrentPlayer(player));
    dispatch(resetNavigation({ player }));
    dispatch(initializeForPlayer(player));
  };

  const handleStart = () => {
    dispatch(setCurrentPage("play"));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-blue-900 to-gray-900 flex flex-col items-center justify-center p-8">
      {/* Game Title */}
      <h1 className="text-6xl font-bold text-center mb-12 bg-gradient-to-r from-blue-400 via-purple-500 to-blue-600 bg-clip-text text-transparent">
        STARSHIP COMMAND
      </h1>

      {!selectedPlayer ? (
        <>
          {/* Rocket Animation - Large */}
          <div className="mb-8">
            <canvas
              ref={rocketCanvasRef}
              width={400}
              height={200}
              className="mx-auto"
            />
            <RocketAnimation
              canvasRef={rocketCanvasRef}
              size="large"
              showTrail={true}
            />
          </div>

          {/* Welcome Description */}
          <div className="mb-12 max-w-2xl text-center">
            <p className="text-lg text-gray-200 leading-relaxed">
              Welcome to Starship Command!
              <br />
              This is a two player game that involves communication to solve
              problems on your ships, so you can escape the solar system together!.
              <br />
              Make sure that both of you choose a different ship, and good luck!
            </p>
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
                <span>ALBATROSS</span>
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
                <span>KESTREL</span>
              </div>
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Rocket Animation - Small */}
          <div>
            <canvas
              ref={rocketCanvasRef}
              width={200}
              height={100}
              className="mx-auto"
            />
            <RocketAnimation
              canvasRef={rocketCanvasRef}
              size="small"
              showTrail={true}
            />
          </div>

          {/* Ship Confirmation */}
          <div className="mb-8 text-center">
            <p className="text-xl text-white font-semibold">
              You are piloting the {selectedPlayer}
            </p>
          </div>

          {/* Mission Briefing */}
          <div className="mb-12 max-w-3xl text-center">
            <p className="text-lg text-gray-200 leading-relaxed">
              You and your partner have left your home planet in very similar
              ships... The only problem is, you have mixed up your schematics!
              <br />
              Communicate and Cooperate to travel 1000km to the space station,
              so you can trade your schematics back.
              <br />
              <br />
              When both of you are ready to go, click Start!
            </p>
          </div>

          {/* Start Button */}
          <button
            onClick={handleStart}
            className="px-12 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 
                     border border-green-500 rounded-lg text-white font-bold text-2xl
                     shadow-lg hover:shadow-green-500/25 transition-all duration-300
                     hover:scale-105 active:scale-95"
          >
            START
          </button>
        </>
      )}

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
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};
