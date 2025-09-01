import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { X } from "lucide-react";
import { setDistanceTravelled } from "../store/shipStore";

interface DebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const [distanceInput, setDistanceInput] = useState("");

  return (
    <div
      className={`fixed top-0 right-0 h-full bg-gray-800 border-l border-gray-600 transform transition-transform duration-300 z-50 ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
      style={{ width: "320px" }}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Debug Menu</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Distance Setter */}
        <div className="space-y-4">
          <label className="text-white font-semibold block">Set Distance</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={distanceInput}
              onChange={(e) => setDistanceInput(e.target.value)}
              className="flex-1 px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded focus:outline-none focus:border-blue-500"
              placeholder="Enter distance"
            />
            <button
              onClick={() => {
                const distance = parseFloat(distanceInput);
                if (!isNaN(distance) && distance >= 0) {
                  dispatch(setDistanceTravelled(distance));
                  setDistanceInput("");
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Set Distance
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};