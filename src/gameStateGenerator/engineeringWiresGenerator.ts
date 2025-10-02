import { SynchedRNG } from "./synchedRNG";

type WireIndex = number & { brand: "__wireIndex" }

export const ENGINEERING_WIRES_WIDTH = 3;
export const ENGINEERING_WIRES_HEIGHT = 3;

export type EngineeringWiresSolution = {
  wireConnections: { x: number, y: number, connectsTo: WireIndex }[],
}

export function getIndexForWireCoord(x: number, y: number, width: number, height: number): number {
  return y * width + x
}

export class EngineeringWiresSolutionGenerator {
  static generateWireSolution(seed: number, width: number, height: number): EngineeringWiresSolution {
    const rng = new SynchedRNG(seed)
    const wireConnections = []
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const connectsTo = (x + 1) * height + Math.floor(rng.getNextRandom() * height) as WireIndex
        wireConnections.push({ x, y, connectsTo })
      }
    }
    return { wireConnections }
  }
}