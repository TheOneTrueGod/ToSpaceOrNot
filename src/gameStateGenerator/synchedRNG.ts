export class SynchedRNG {
  private readonly MODULUS = 229_433;
  private currSeed: number;
  constructor(private startSeed: number) {
    this.currSeed = startSeed
  }

  setSeed(seed: number) {
    this.startSeed = seed
    this.currSeed = seed
  }

  reset() {
    this.currSeed = this.startSeed
  }

  private advanceRNG() {
    this.currSeed = (this.currSeed * 541_027 + 373_363) % this.MODULUS
  }

  getCurrentSeed(): number {
    return this.currSeed
  }

  getNextRandom(): number {
    this.advanceRNG()
    return this.currSeed / this.MODULUS
  }

  getNextSeed(): number {
    this.advanceRNG()
    return this.currSeed
  }
}

export function seedToCode(seed: number): string {
  const rng = new SynchedRNG(seed)
  var chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  var randomCode = '';
  for (var i = 0; i < 5; i++) {
    randomCode += chars[Math.floor(rng.getNextRandom() * chars.length)];
  }
  return randomCode
}