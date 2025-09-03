import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store";
import { resumeJourney } from "../store/shipStore";
import { Players } from "../types";
import { StationTitle } from "../components/StationTitle";
import { NavigationControls } from "./components/NavigationControls";
import { NavigationSchematics } from "./components/NavigationSchematics";
import { WeaponsConsole } from "./components/WeaponsConsole";
import { DEBUG_MODE } from "../pages/PlayPage";

export const MainScreen: React.FC = () => {
  const dispatch = useDispatch();
  const navigationState = useSelector((state: RootState) => state.navigation);
  const shipState = useSelector((state: RootState) => state.ship);
  const currentPlayer = useSelector(
    (state: RootState) => state.game.currentPlayer
  );

  const [validationError, setValidationError] = useState<string | null>(null);
  const [viewingSchematic, setViewingSchematic] = useState(false);

  const handleResumeJourney = () => {
    // Get the correct values for the current player
    const correctValues = currentPlayer === Players.PLAYER_ONE
      ? navigationState.correctValues.albatross
      : navigationState.correctValues.kestrel;
    
    // Check if current values match correct values (with small tolerance for floating point)
    const tolerance = 0.01;
    const isValid = 
      Math.abs(navigationState.current.pitch - correctValues.pitch) < tolerance &&
      Math.abs(navigationState.current.yaw - correctValues.yaw) < tolerance &&
      Math.abs(navigationState.current.roll - correctValues.roll) < tolerance;
    
    if (isValid) {
      dispatch(resumeJourney());
      setValidationError(null);
    } else {
      setValidationError("Invalid navigation values - check your settings against your correct values");
    }
  };

  const getDistanceTraveled = () => {
    return (
      shipState.distanceToDestination.max -
      shipState.distanceToDestination.current
    );
  };

  return (
    <div className="bg-gray-800 p-6 h-full flex flex-col">
      <StationTitle>Main Screen</StationTitle>

      {/* Main Two-Column Layout */}
      <div className="flex gap-4 mb-4">
        {/* Left Column - Navigation Controls or Schematics */}
        <div className="relative w-[180px] flex flex-col">
          {/* Content - constrained height to match weapons console */}
          <div className="flex-1 max-h-[300px] mb-2">
            {viewingSchematic ? <NavigationSchematics /> : <NavigationControls />}
          </div>
          
          {/* Toggle Button */}
          <button
            onClick={() => setViewingSchematic(!viewingSchematic)}
            className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-mono text-sm rounded transition-colors"
          >
            {viewingSchematic 
              ? "Back to Navigation Controls" 
              : `View ${currentPlayer === Players.PLAYER_ONE ? "Kestrel" : "Albatross"}'s Schematic`}
          </button>
        </div>

        {/* Right Column - Weapons Console */}
        <div className="flex-1">
          <WeaponsConsole />
        </div>
      </div>

      {/* Navigation Sync Section - Full Width at Bottom */}
      {shipState.isOnBreak && (
        <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
          <h3 className="text-white text-lg font-mono mb-3 text-center">
            Navigation Sync Required
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-gray-300 font-mono text-sm">
              <p>Distance traveled: {Math.floor(getDistanceTraveled())} km</p>
              <p>Wait for your partner to reach this checkpoint.</p>
            </div>
            <div className="text-gray-300 font-mono text-sm">
              <p>Use this time to make repairs and prepare for the next leg.</p>
              <p>When both of you have reached this checkpoint, ensure correct navigation values and resume the journey together!</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleResumeJourney}
              className="bg-blue-600 hover:bg-blue-700 text-white font-mono px-6 py-3 rounded-lg transition-colors"
            >
              Resume Journey
            </button>
            
            {validationError && (
              <div className="text-red-400 font-mono">
                {validationError}
              </div>
            )}
          </div>

          {/* Debug Mode: Show Current Player's Correct Values */}
          {DEBUG_MODE && (
            <div className="mt-4 bg-red-900 p-3 rounded border border-red-600">
              <h4 className="text-sm font-mono text-red-400 mb-2 text-center">
                [DEBUG] Your Correct Values
              </h4>
              <div className="flex justify-center gap-8">
                <div className="text-red-300 font-mono text-sm">
                  Pitch: {currentPlayer === Players.PLAYER_ONE
                    ? navigationState.correctValues.albatross.pitch.toFixed(1)
                    : navigationState.correctValues.kestrel.pitch.toFixed(1)}
                </div>
                <div className="text-red-300 font-mono text-sm">
                  Yaw: {currentPlayer === Players.PLAYER_ONE
                    ? navigationState.correctValues.albatross.yaw.toFixed(1)
                    : navigationState.correctValues.kestrel.yaw.toFixed(1)}
                </div>
                <div className="text-red-300 font-mono text-sm">
                  Roll: {currentPlayer === Players.PLAYER_ONE
                    ? navigationState.correctValues.albatross.roll.toFixed(1)
                    : navigationState.correctValues.kestrel.roll.toFixed(1)}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};