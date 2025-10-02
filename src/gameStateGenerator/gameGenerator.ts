import { Player, Players } from "../types";
import { SECONDS_IN_DAY } from "../utils/dateUtils";
import { ENGINEERING_WIRES_HEIGHT, ENGINEERING_WIRES_WIDTH, EngineeringWiresSolution, EngineeringWiresSolutionGenerator } from "./engineeringWiresGenerator";
import { NavigationSyncSolution, NavigationSyncSolutionGenerator } from "./navigationSyncGenerator";

const gameStateAtStart = new Date()

export type GameSeed = number & { _brand: "GameSeed" };
function dateToGameSeed(date: Date): GameSeed {
  const time = Math.floor(date.getTime() / SECONDS_IN_DAY) as GameSeed

  return (time * 630587 + 782107) % 787477 as GameSeed
}

type StationSolutions = {
  'engineeringWires': EngineeringWiresSolution,
  'navigationSync': NavigationSyncSolution,
}

type Stations = 'engineeringWires' | 'navigationSync'

type ShipSolutions = {
  [key in Player]: {
    seed: number,
    stations: Partial<StationSolutions>
  }
}

class GameGeneratorClass {
  static created = false
  private gameSeed: number;
  private shipSolutions: ShipSolutions = {
    [Players.PLAYER_ONE]: { seed: 0, stations: {} },
    [Players.PLAYER_TWO]: { seed: 0, stations: {} }
  }
  constructor() {
    if (GameGeneratorClass.created) {
      throw new Error("GameGeneratorClass is a singleton")
    }

    GameGeneratorClass.created = true;
    this.gameSeed = dateToGameSeed(gameStateAtStart)
    this.setGameSeed(this.gameSeed);
  }

  setGameSeed(seed: number) {
    this.gameSeed = seed
    const firstSeed = (seed * 9301 + 49297) % 233280
    const secondSeed = (firstSeed * 9301 + 49297) % 233280

    this.shipSolutions = {
      [Players.PLAYER_ONE]: { seed: firstSeed, stations: {} },
      [Players.PLAYER_TWO]: { seed: secondSeed, stations: {} }
    }

  }

  getShipSeed(ship: Player): number {
    return this.shipSolutions[ship].seed
  }

  getStationSolution<T extends Stations>
    (ship: Player, station: T): StationSolutions[T] {
    if (this.shipSolutions[ship].stations[station]) {
      return this.shipSolutions[ship].stations[station]
    }

    const solution = this.generateStationSolution(ship, station)
    this.shipSolutions[ship].stations[station] = solution
    return solution
  }

  private generateStationSolution<T extends Stations>
    (ship: Player, station: T): StationSolutions[T] {
    const shipSeed = this.getShipSeed(ship)
    if (station === 'engineeringWires') {

      station
      const engineeringSolution = EngineeringWiresSolutionGenerator.generateWireSolution(shipSeed, ENGINEERING_WIRES_WIDTH, ENGINEERING_WIRES_HEIGHT)
      return engineeringSolution;
    }
    switch (station) {
      case 'engineeringWires':
      case 'navigationSync':
        return NavigationSyncSolutionGenerator.generateNavigationKey(shipSeed)
    }
  }

  private generateEngineeringWiresSolution(ship: Player): EngineeringWiresSolution {
    const shipSeed = this.getShipSeed(ship)
    return EngineeringWiresSolutionGenerator.generateWireSolution(shipSeed, ENGINEERING_WIRES_WIDTH, ENGINEERING_WIRES_HEIGHT)
  }

}

const GameGenerator = new GameGeneratorClass()

export default GameGenerator