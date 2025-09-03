import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store";
import { updateNavigationValue } from "../store/stations/navigationStore";
import { resumeJourney } from "../store/shipStore";
import { Players } from "../types";
import { StationTitle } from "../components/StationTitle";
import { DEBUG_MODE } from "../pages/PlayPage";

export const Navigation: React.FC = () => {
  const dispatch = useDispatch();
  const navigationState = useSelector((state: RootState) => state.navigation);
  const shipState = useSelector((state: RootState) => state.ship);
  const currentPlayer = useSelector(
    (state: RootState) => state.game.currentPlayer
  );

  const [validationError, setValidationError] = useState<string | null>(null);

  // Local state for input values
  const [localValues, setLocalValues] = useState({
    pitch: navigationState.current.pitch.toString(),
    yaw: navigationState.current.yaw.toString(),
    roll: navigationState.current.roll.toString(),
  });

  // Update local state when store changes
  useEffect(() => {
    setLocalValues({
      pitch: navigationState.current.pitch.toString(),
      yaw: navigationState.current.yaw.toString(),
      roll: navigationState.current.roll.toString(),
    });
  }, [navigationState.current]);

  const handleInputChange = (axis: "pitch" | "yaw" | "roll", value: string) => {
    const numValue = parseFloat(value) || 0;

    // Update local state immediately for responsive UI
    setLocalValues((prev) => ({
      ...prev,
      [axis]: value,
    }));

    // Update the store
    dispatch(updateNavigationValue({ axis, value: numValue, relative: false }));
    
    // Clear validation error when values change
    if (validationError) {
      setValidationError(null);
    }
  };

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
      setValidationError("Invalid navigation values");
    }
  };

  const getDistanceTraveled = () => {
    return (
      shipState.distanceToDestination.max -
      shipState.distanceToDestination.current
    );
  };

  return (
    <div className="bg-gray-800 p-6 h-full">
      <StationTitle>Navigation Station</StationTitle>

			 {/* Resume Journey Section - only shown during breaks */}
			 {shipState.isOnBreak && (
        <div className="mb-6 bg-gray-700 p-4 rounded-lg border border-gray-600">
          <h3 className="text-white text-lg font-mono mb-3 text-center">
            Journey Break
          </h3>
          <div className="text-center text-gray-300 font-mono text-sm mb-4">
            <p>Distance traveled: {Math.floor(getDistanceTraveled())} km</p>
            <p>Wait for your partner to reach this checkpoint.</p>
            <p>Use this time to make repairs and prepare for the next leg.</p>
            <p>
              When both of you have reached this checkpoint, ensure correct navigation values
              and resume the journey together!
            </p>
          </div>

          <div className="text-center">
            <button
              onClick={handleResumeJourney}
              className="bg-blue-600 hover:bg-blue-700 text-white font-mono px-6 py-3 rounded-lg transition-colors"
            >
              Resume Journey
            </button>
            {validationError && (
              <div className="text-red-400 text-sm font-mono mt-2">
                {validationError}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation Controls Section */}
      <div className="space-y-6">
        {/* Current Navigation Inputs */}
        <div className="bg-gray-400 p-4 rounded-lg border border-gray-300">
          <h3 className="text-sm font-mono text-gray-700 mb-3 text-center">
            Current Navigation Settings
          </h3>
          <div className="flex items-center space-x-4">
            {/* Pitch Input */}
            <div className="flex-1 flex flex-col items-center">
              <label className="block text-sm font-mono text-gray-700 mb-2">
                Pitch
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={localValues.pitch}
                onChange={(e) => handleInputChange("pitch", e.target.value)}
                className="w-full px-2 py-1 bg-white border border-gray-600 rounded font-mono text-sm text-gray-900"
              />
            </div>

            {/* Yaw Input */}
            <div className="flex-1 flex flex-col items-center">
              <label className="block text-sm font-mono text-gray-700 mb-2">
                Yaw
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={localValues.yaw}
                onChange={(e) => handleInputChange("yaw", e.target.value)}
                className="w-full px-2 py-1 bg-white border border-gray-600 rounded font-mono text-sm text-gray-900"
              />
            </div>

            {/* Roll Input */}
            <div className="flex-1 flex flex-col items-center">
              <label className="block text-sm font-mono text-gray-700 mb-2">
                Roll
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={localValues.roll}
                onChange={(e) => handleInputChange("roll", e.target.value)}
                className="w-full px-2 py-1 bg-white border border-gray-600 rounded font-mono text-sm text-gray-900"
              />
            </div>
          </div>
        </div>

        {/* Other Player's Correct Values */}
        <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
          <h3 className="text-sm font-mono text-teal-400 mb-3 text-center">
            {currentPlayer === Players.PLAYER_ONE ? "Kestrel's" : "Albatross's"} Correct Values
          </h3>
          <div className="flex items-center space-x-4">
            {/* Other Player's Pitch */}
            <div className="flex-1 flex flex-col items-center">
              <label className="block text-sm font-mono text-gray-400 mb-2">
                Pitch
              </label>
              <div className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded font-mono text-sm text-white text-center">
                {currentPlayer === Players.PLAYER_ONE
                  ? navigationState.correctValues.kestrel.pitch.toFixed(1)
                  : navigationState.correctValues.albatross.pitch.toFixed(1)}
              </div>
            </div>

            {/* Other Player's Yaw */}
            <div className="flex-1 flex flex-col items-center">
              <label className="block text-sm font-mono text-gray-400 mb-2">
                Yaw
              </label>
              <div className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded font-mono text-sm text-white text-center">
                {currentPlayer === Players.PLAYER_ONE
                  ? navigationState.correctValues.kestrel.yaw.toFixed(1)
                  : navigationState.correctValues.albatross.yaw.toFixed(1)}
              </div>
            </div>

            {/* Other Player's Roll */}
            <div className="flex-1 flex flex-col items-center">
              <label className="block text-sm font-mono text-gray-400 mb-2">
                Roll
              </label>
              <div className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded font-mono text-sm text-white text-center">
                {currentPlayer === Players.PLAYER_ONE
                  ? navigationState.correctValues.kestrel.roll.toFixed(1)
                  : navigationState.correctValues.albatross.roll.toFixed(1)}
              </div>
            </div>
          </div>
        </div>

        {/* Debug Mode: Current Player's Correct Values */}
        {DEBUG_MODE && (
          <div className="bg-red-900 p-4 rounded-lg border border-red-600">
            <h3 className="text-sm font-mono text-red-400 mb-3 text-center">
              [DEBUG] Your Correct Values
            </h3>
            <div className="flex items-center space-x-4">
              {/* Current Player's Pitch */}
              <div className="flex-1 flex flex-col items-center">
                <label className="block text-sm font-mono text-red-300 mb-2">
                  Pitch
                </label>
                <div className="w-full px-2 py-1 bg-red-800 border border-red-500 rounded font-mono text-sm text-white text-center">
                  {currentPlayer === Players.PLAYER_ONE
                    ? navigationState.correctValues.albatross.pitch.toFixed(1)
                    : navigationState.correctValues.kestrel.pitch.toFixed(1)}
                </div>
              </div>

              {/* Current Player's Yaw */}
              <div className="flex-1 flex flex-col items-center">
                <label className="block text-sm font-mono text-red-300 mb-2">
                  Yaw
                </label>
                <div className="w-full px-2 py-1 bg-red-800 border border-red-500 rounded font-mono text-sm text-white text-center">
                  {currentPlayer === Players.PLAYER_ONE
                    ? navigationState.correctValues.albatross.yaw.toFixed(1)
                    : navigationState.correctValues.kestrel.yaw.toFixed(1)}
                </div>
              </div>

              {/* Current Player's Roll */}
              <div className="flex-1 flex flex-col items-center">
                <label className="block text-sm font-mono text-red-300 mb-2">
                  Roll
                </label>
                <div className="w-full px-2 py-1 bg-red-800 border border-red-500 rounded font-mono text-sm text-white text-center">
                  {currentPlayer === Players.PLAYER_ONE
                    ? navigationState.correctValues.albatross.roll.toFixed(1)
                    : navigationState.correctValues.kestrel.roll.toFixed(1)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
