import { seedToCode, SynchedRNG } from "./synchedRNG";

type WireIndex = number & { brand: "__wireIndex" }

export const ENGINEERING_WIRES_WIDTH = 3;
export const ENGINEERING_WIRES_HEIGHT = 3;

export type NavigationSyncSolution = {
  navigationKey: string,
}

export class NavigationSyncSolutionGenerator {
  static generateNavigationKey(seed: number): NavigationSyncSolution {
    const rng = new SynchedRNG(seed)
    return { navigationKey: seedToCode(rng.getNextSeed()) }
  }
}