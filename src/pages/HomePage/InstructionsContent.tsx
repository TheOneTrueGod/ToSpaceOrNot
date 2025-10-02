import React, { useRef } from "react";
import { RocketAnimation } from "../../components/RocketAnimation";
import { Player } from "../../types";
import { ContentPane } from "../../components/ContentPane";

type Props = {
  selectedPlayer: Player;
  handleStart: () => void;
};

export const InstructionsContent: React.FC<Props> = ({
  selectedPlayer,
  handleStart,
}) => {
  const rocketCanvasRef = useRef<HTMLCanvasElement>(null);

  return (
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

      <ContentPane className="max-w-2xl text-center">
        {/* Ship Confirmation */}
        <p className="text-xl text-white font-semibold">
          You are piloting the {selectedPlayer}
        </p>
        <br />
        {/* Mission Briefing */}
        <p className="text-lg text-gray-200 leading-relaxed">
          You and your partner have embarked in similar ships... The only
          problem is, you have mixed up your schematics!
          <br />
          Communicate and Cooperate to travel 1000km to the space station, so
          you can trade your schematics back.
          <br />
          <br />
          When both of you are ready to go, click Start!
        </p>
      </ContentPane>

      {/* Start Button */}
      <button
        onClick={handleStart}
        className="px-12 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 
												 border border-green-500 rounded-lg text-white font-bold text-2xl
												 shadow-lg hover:shadow-green-500/25 transition-all duration-300
												 hover:scale-105 active:scale-95 mt-auto"
      >
        START
      </button>
    </>
  );
};
