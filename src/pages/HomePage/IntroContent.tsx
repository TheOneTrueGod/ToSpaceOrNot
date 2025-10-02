import React, { useRef } from "react";
import { RocketAnimation } from "../../components/RocketAnimation";
import { Player, Players } from "../../types";
import { ContentPane } from "../../components/ContentPane";

type Props = {
  handlePlayerSelect: (player: Player) => void;
};

export const IntroContent: React.FC<Props> = ({ handlePlayerSelect }) => {
  const rocketCanvasRef = useRef<HTMLCanvasElement>(null);

  return (
    <>
      {/* Rocket Animation - Large */}
      <div className="-my-8">
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
      <ContentPane className="max-w-2xl text-center">
        <p className="text-lg text-gray-200 leading-relaxed">
          Welcome to Spacebound!
          <br />
          This is a two player game that involves communication to solve
          problems on your ships, so you can escape the solar system!.
          <br />
          <br />
          Make sure that each of you chooses a different ship, and good luck!
        </p>
      </ContentPane>

      {/* Player Selection */}
      <div className="flex flex-row w-full mt-auto">
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
													 hover:scale-105 active:scale-95 ml-auto"
        >
          <div className="flex flex-col items-center">
            <span className="text-2xl mb-1">🧭</span>
            <span>KESTREL</span>
          </div>
        </button>
      </div>
    </>
  );
};
