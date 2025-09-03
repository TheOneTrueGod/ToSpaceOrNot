import React from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { Players } from "../../types";

export const NavigationSchematics: React.FC = () => {
  const navigationState = useSelector((state: RootState) => state.navigation);
  const currentPlayer = useSelector(
    (state: RootState) => state.game.currentPlayer
  );

  // Get the other player's correct values
  const otherPlayerValues = currentPlayer === Players.PLAYER_ONE
    ? navigationState.correctValues.kestrel
    : navigationState.correctValues.albatross;
  
  const otherPlayerName = currentPlayer === Players.PLAYER_ONE
    ? "Kestrel"
    : "Albatross";

  return (
    <div className="bg-yellow-100 p-4 rounded-lg border-2 border-yellow-600 h-full flex flex-col">
      <h3 className="text-sm font-mono text-gray-800 mb-2 text-center font-bold">
        {otherPlayerName}'s Targets
      </h3>
      
      <div className="flex flex-col justify-evenly flex-1 space-y-2">
        {/* Pitch Value */}
        <div className="flex flex-col items-center">
          <label className="block text-sm font-mono text-gray-700 mb-2">
            Pitch
          </label>
          <div className="w-24 px-2 py-1 bg-yellow-50 border border-yellow-500 rounded font-mono text-sm text-gray-800 text-center">
            {otherPlayerValues.pitch.toFixed(1)}
          </div>
        </div>

        {/* Yaw Value */}
        <div className="flex flex-col items-center">
          <label className="block text-sm font-mono text-gray-700 mb-2">
            Yaw
          </label>
          <div className="w-24 px-2 py-1 bg-yellow-50 border border-yellow-500 rounded font-mono text-sm text-gray-800 text-center">
            {otherPlayerValues.yaw.toFixed(1)}
          </div>
        </div>

        {/* Roll Value */}
        <div className="flex flex-col items-center">
          <label className="block text-sm font-mono text-gray-700 mb-2">
            Roll
          </label>
          <div className="w-24 px-2 py-1 bg-yellow-50 border border-yellow-500 rounded font-mono text-sm text-gray-800 text-center">
            {otherPlayerValues.roll.toFixed(1)}
          </div>
        </div>
      </div>
    </div>
  );
};