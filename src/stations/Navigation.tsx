import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store";
import { updateNavigationValue } from "../store/stations/navigationStore";
import { resumeJourney } from "../store/shipStore";
import { DEBUG_MODE } from "../store/stations/engineeringStore";

export const Navigation: React.FC = () => {
  const dispatch = useDispatch();
  const navigationState = useSelector((state: RootState) => state.navigation);
  const shipState = useSelector((state: RootState) => state.ship);
  const currentPlayer = useSelector(
    (state: RootState) => state.game.currentPlayer
  );

  const [countdown, setCountdown] = useState<number | null>(null);

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
    dispatch(updateNavigationValue({ axis, value: numValue }));
  };

  const handleResumeJourney = () => {
    setCountdown(3);
  };

  // Countdown effect
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      // Blastoff!
      setTimeout(() => {
        dispatch(resumeJourney());
        setCountdown(null);
      }, 1000);
    }
  }, [countdown, dispatch]);

  const getDistanceTraveled = () => {
    return (
      shipState.distanceToDestination.max -
      shipState.distanceToDestination.current
    );
  };

  return (
    <div className="bg-gray-800 p-6 h-full">
      <h2 className="text-white text-xl font-mono mb-4">Navigation Station</h2>

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
            {currentPlayer === "Gobi" ? "Ben's" : "Gobi's"} Correct Values
          </h3>
          <div className="flex items-center space-x-4">
            {/* Other Player's Pitch */}
            <div className="flex-1 flex flex-col items-center">
              <label className="block text-sm font-mono text-gray-400 mb-2">
                Pitch
              </label>
              <div className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded font-mono text-sm text-white text-center">
                {currentPlayer === "Gobi"
                  ? navigationState.correctValues.ben.pitch.toFixed(1)
                  : navigationState.correctValues.gobi.pitch.toFixed(1)}
              </div>
            </div>

            {/* Other Player's Yaw */}
            <div className="flex-1 flex flex-col items-center">
              <label className="block text-sm font-mono text-gray-400 mb-2">
                Yaw
              </label>
              <div className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded font-mono text-sm text-white text-center">
                {currentPlayer === "Gobi"
                  ? navigationState.correctValues.ben.yaw.toFixed(1)
                  : navigationState.correctValues.gobi.yaw.toFixed(1)}
              </div>
            </div>

            {/* Other Player's Roll */}
            <div className="flex-1 flex flex-col items-center">
              <label className="block text-sm font-mono text-gray-400 mb-2">
                Roll
              </label>
              <div className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded font-mono text-sm text-white text-center">
                {currentPlayer === "Gobi"
                  ? navigationState.correctValues.ben.roll.toFixed(1)
                  : navigationState.correctValues.gobi.roll.toFixed(1)}
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
                  {currentPlayer === "Gobi"
                    ? navigationState.correctValues.gobi.pitch.toFixed(1)
                    : navigationState.correctValues.ben.pitch.toFixed(1)}
                </div>
              </div>

              {/* Current Player's Yaw */}
              <div className="flex-1 flex flex-col items-center">
                <label className="block text-sm font-mono text-red-300 mb-2">
                  Yaw
                </label>
                <div className="w-full px-2 py-1 bg-red-800 border border-red-500 rounded font-mono text-sm text-white text-center">
                  {currentPlayer === "Gobi"
                    ? navigationState.correctValues.gobi.yaw.toFixed(1)
                    : navigationState.correctValues.ben.yaw.toFixed(1)}
                </div>
              </div>

              {/* Current Player's Roll */}
              <div className="flex-1 flex flex-col items-center">
                <label className="block text-sm font-mono text-red-300 mb-2">
                  Roll
                </label>
                <div className="w-full px-2 py-1 bg-red-800 border border-red-500 rounded font-mono text-sm text-white text-center">
                  {currentPlayer === "Gobi"
                    ? navigationState.correctValues.gobi.roll.toFixed(1)
                    : navigationState.correctValues.ben.roll.toFixed(1)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Resume Journey Section - only shown during breaks */}
      {shipState.isOnBreak && (
        <div className="mt-6 bg-gray-700 p-4 rounded-lg border border-gray-600">
          <h3 className="text-white text-lg font-mono mb-3 text-center">
            Journey Break
          </h3>
          <div className="text-center text-gray-300 font-mono text-sm mb-4">
            <p>Distance traveled: {Math.floor(getDistanceTraveled())} km</p>
            <p>Wait for your partner to reach this checkpoint.</p>
            <p>Use this time to make repairs and prepare for the next leg.</p>
            <p>
              When both of you have reached this checkpoint, countdown and
              resume the journey together!.
            </p>
          </div>

          {countdown !== null ? (
            <div className="text-center">
              {countdown > 0 ? (
                <div className="text-white text-2xl font-mono font-bold">
                  {countdown}
                </div>
              ) : (
                <div className="text-green-400 text-xl font-mono font-bold">
                  BLASTOFF!
                </div>
              )}
            </div>
          ) : (
            <div className="text-center">
              <button
                onClick={handleResumeJourney}
                className="bg-blue-600 hover:bg-blue-700 text-white font-mono px-6 py-3 rounded-lg transition-colors"
              >
                Resume Journey
              </button>
              <div className="text-gray-400 text-xs font-mono mt-2">
                Count down: 3, 2, 1, Blastoff!
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
