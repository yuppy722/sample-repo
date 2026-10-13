// Stochastic spatiotemporal growth model (Maskawa et al., Phys. Rev. Research 7, 013269, 2025).
// Micromodel at each site x: n(x, t+Δt) = g(x, t) n(x, t) + f, with g ∈ {1/2, 1, 2}.
// Observed abundance N(t) = Σx n(x, t); observed growth rate G^τ = N(t + τΔt) / N(t).

export const P_HALF = 0.2;
export const P_SAME = 0.68;
export const F_ADD = 1;
export const TAUS = [1, 5, 10, 30, 100];
export const BIN_W = 0.4;
export const BINS = 13;
export const BIN_FROM = -BIN_W * (BINS / 2);

// The power-law exponent solves <g^α> = 1.
export function alphaOf() {
  const p2 = 1 - P_HALF - P_SAME;
  const moment = (a) => P_HALF * 0.5 ** a + P_SAME + p2 * 2 ** a;
  let lo = 0.01, hi = 5;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (moment(mid) > 1) hi = mid; else lo = mid;
  }
  return (lo + hi) / 2;
}

export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function step(n, random) {
  for (let i = 0; i < n.length; i++) {
    const u = random();
    const g = u < P_HALF ? 0.5 : u < P_HALF + P_SAME ? 1 : 2;
    n[i] = g * n[i] + F_ADD;
  }
}

export const total = (n) => n.reduce((a, b) => a + b, 0);

export function binOf(logG) {
  const index = Math.floor((logG - BIN_FROM) / BIN_W);
  return Math.max(0, Math.min(BINS - 1, index));
}

// Histogram of log10 G^τ over `samples` consecutive observations of one M-site system.
export function histogram(M, tau, samples, seed) {
  const random = rng(seed);
  const n = new Float64Array(M);
  for (let i = 0; i < M; i++) n[i] = 1 + 9 * random();
  for (let t = 0; t < 2000; t++) step(n, random);
  const counts = new Array(BINS).fill(0);
  let N = total(n);
  for (let k = 0; k < samples; k++) {
    for (let t = 0; t < tau; t++) step(n, random);
    const next = total(n);
    counts[binOf(Math.log10(next / N))]++;
    N = next;
  }
  return counts;
}
