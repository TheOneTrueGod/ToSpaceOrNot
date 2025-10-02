import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { MobilePageTitle } from "../../components/MobilePageTitle";
import { MobilePageWrapper } from "../../components/MobilePageWrapper";
import { setCurrentPage, setCurrentPlayer } from "../../store/gameStore";
import {
  cutRandomCablesAtStart,
  initializeForPlayer,
} from "../../store/stations/engineeringStore";
import { resetNavigation } from "../../store/stations/navigationStore";
import { Player } from "../../types";
import { InstructionsContent } from "./InstructionsContent";
import { IntroContent } from "./IntroContent";

export const HomePageMobile: React.FC = () => {
  const dispatch = useDispatch();
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const handlePlayerSelect = (player: Player) => {
    setSelectedPlayer(player);
    dispatch(setCurrentPlayer(player));
    dispatch(resetNavigation({ player }));
    dispatch(initializeForPlayer(player));
    // Cut exactly 2 random cables from each panel at game start
    dispatch(cutRandomCablesAtStart({ player, cablesPerPanel: 2 }));
  };

  const handleStart = () => {
    dispatch(setCurrentPage("play"));
  };

  return (
    <MobilePageWrapper>
      {/* Game Title */}
      <MobilePageTitle>SPACEBOUND</MobilePageTitle>

      {!selectedPlayer ? (
        <IntroContent handlePlayerSelect={handlePlayerSelect} />
      ) : (
        <InstructionsContent
          selectedPlayer={selectedPlayer}
          handleStart={handleStart}
        />
      )}
    </MobilePageWrapper>
  );
};
