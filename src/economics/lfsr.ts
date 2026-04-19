export class PRNG {
  private state: number;

  constructor(seed: number) {
    this.state = (Math.trunc(seed) >>> 0) || 0;
  }

  private nextUint32() {
    // Numerical Recipes LCG parameters.
    this.state = (Math.imul(this.state, 1664525) + 1013904223) >>> 0;
    return this.state;
  }

  rand(min: number, max?: number) {
    let lower = min;
    let upper = max;

    if (upper === undefined) {
      upper = lower;
      lower = 0;
    }

    if (lower > upper) {
      [lower, upper] = [upper, lower];
    }

    const range = upper - lower;
    if (range <= 0) {
      return lower;
    }

    return lower + (this.nextUint32() % (range + 1));
  }
}
