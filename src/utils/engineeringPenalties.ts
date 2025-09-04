import { EngineeringState, getWeaponsPenaltyMultiplier, getFuelPenaltyMultiplier, getPowerPenaltyMultiplier, getThrustPenaltyMultiplier, EngineeringSystems } from '../store/stations/engineeringStore';
import { Players } from '../types';

export interface SystemPenalty {
  name: EngineeringSystems;
  penalty: number;
}

export const getSystemPenalties = (
  engineeringState: EngineeringState | undefined,
  currentPlayer: string
): SystemPenalty[] => {
  if (!engineeringState) {
    return [
      { name: 'Weapons', penalty: 1 },
      { name: 'Fuel', penalty: 1 },
      { name: 'Power', penalty: 1 },
      { name: 'Thrust', penalty: 1 }
    ];
  }

  return [
    {
      name: 'Weapons',
      penalty: getWeaponsPenaltyMultiplier(engineeringState, currentPlayer as typeof Players.PLAYER_ONE)
    },
    {
      name: 'Fuel', 
      penalty: getFuelPenaltyMultiplier(engineeringState, currentPlayer as typeof Players.PLAYER_ONE)
    },
    {
      name: 'Power',
      penalty: getPowerPenaltyMultiplier(engineeringState, currentPlayer as typeof Players.PLAYER_ONE)
    },
    {
      name: 'Thrust',
      penalty: getThrustPenaltyMultiplier(engineeringState, currentPlayer as typeof Players.PLAYER_ONE)  
    }
  ];
};