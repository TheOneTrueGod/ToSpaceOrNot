import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store";
import { updateNavigationValue } from "../../store/stations/navigationStore";

export const NavigationControls: React.FC = () => {
  const dispatch = useDispatch();
  const navigationState = useSelector((state: RootState) => state.navigation);

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
  };

  return (
    <div className="bg-gray-700 p-4 rounded-lg border border-gray-600 h-full flex flex-col">
      <h3 className="text-sm font-mono text-gray-300 mb-2 text-center">
        Navigation Controls
      </h3>
      
      <div className="flex flex-col justify-evenly flex-1 space-y-2">
        {/* Pitch Input */}
        <div className="flex flex-col items-center">
          <label className="block text-sm font-mono text-gray-300 mb-2">
            Pitch
          </label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={localValues.pitch}
            onChange={(e) => handleInputChange("pitch", e.target.value)}
            className="w-24 px-2 py-1 bg-gray-800 border border-gray-500 rounded font-mono text-sm text-white text-center"
          />
        </div>

        {/* Yaw Input */}
        <div className="flex flex-col items-center">
          <label className="block text-sm font-mono text-gray-300 mb-2">
            Yaw
          </label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={localValues.yaw}
            onChange={(e) => handleInputChange("yaw", e.target.value)}
            className="w-24 px-2 py-1 bg-gray-800 border border-gray-500 rounded font-mono text-sm text-white text-center"
          />
        </div>

        {/* Roll Input */}
        <div className="flex flex-col items-center">
          <label className="block text-sm font-mono text-gray-300 mb-2">
            Roll
          </label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={localValues.roll}
            onChange={(e) => handleInputChange("roll", e.target.value)}
            className="w-24 px-2 py-1 bg-gray-800 border border-gray-500 rounded font-mono text-sm text-white text-center"
          />
        </div>
      </div>
    </div>
  );
};