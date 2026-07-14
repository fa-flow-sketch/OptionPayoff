// Black-Scholes pricing engine with Abramowitz & Stegun norm CDF approximation

// Standard normal CDF using Abramowitz & Stegun approximation (error < 7.5e-8)
export function normCDF(x: number): number {
  if (!isFinite(x)) return x > 0 ? 1 : 0;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX / 2);
  return 0.5 * (1.0 + sign * y);
}

// Standard normal PDF
export function normPDF(x: number): number {
  if (!isFinite(x)) return 0;
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

export interface BSResult {
  price: number;
  delta: number;
  gamma: number;
  vega: number;
  theta: number; // daily theta
}

export function bsPrice(
  S: number,
  K: number,
  T: number, // in years
  r: number, // decimal
  sigma: number, // decimal
  type: 'call' | 'put'
): BSResult {
  // Edge case: expired
  if (T <= 0) {
    const intrinsic = type === 'call' ? Math.max(S - K, 0) : Math.max(K - S, 0);
    const d = type === 'call' ? (S > K ? 1 : S === K ? 0.5 : 0) : (S < K ? -1 : S === K ? -0.5 : 0);
    return { price: intrinsic, delta: d, gamma: 0, vega: 0, theta: 0 };
  }

  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  const Nd1 = normCDF(d1);
  const Nd2 = normCDF(d2);
  const nd1 = normPDF(d1);
  const expRT = Math.exp(-r * T);

  let price: number;
  let delta: number;

  if (type === 'call') {
    price = S * Nd1 - K * expRT * Nd2;
    delta = Nd1;
  } else {
    price = K * expRT * normCDF(-d2) - S * normCDF(-d1);
    delta = Nd1 - 1;
  }

  const gamma = nd1 / (S * sigma * sqrtT);
  const vega = S * nd1 * sqrtT / 100; // per 1% move in vol
  
  // Daily theta
  const thetaAnnual = type === 'call'
    ? -(S * nd1 * sigma / (2 * sqrtT)) - r * K * expRT * Nd2
    : -(S * nd1 * sigma / (2 * sqrtT)) + r * K * expRT * normCDF(-d2);
  const theta = thetaAnnual / 365;

  return {
    price: Math.max(price, 0),
    delta,
    gamma,
    vega,
    theta,
  };
}

// Newton-Raphson IV solver: backs out implied volatility from a market option price
export function bsIv(
  marketPrice: number,
  S: number,
  K: number,
  T: number, // years to expiry
  r: number,  // decimal
  type: 'call' | 'put'
): number | null {
  if (T <= 0) return null;
  if (marketPrice <= 0) return null;

  const MAX_ITER = 100;
  const TOLERANCE = 1e-8;
  const MIN_SIGMA = 0.001;
  const MAX_SIGMA = 5.0;

  // Initial guess: ATM approximation sigma ≈ sqrt(2*pi/T) * marketPrice / S
  let sigma = Math.max(MIN_SIGMA, Math.min(MAX_SIGMA,
    Math.sqrt(2 * Math.PI / T) * marketPrice / S
  ));

  for (let i = 0; i < MAX_ITER; i++) {
    const bs = bsPrice(S, K, T, r, sigma, type);
    const priceDiff = bs.price - marketPrice;

    if (Math.abs(priceDiff) < TOLERANCE) return sigma;

    // Vega is per 1% move; derivative w.r.t. sigma (decimal) is vega * 100
    const vegaDecimal = bs.vega * 100;
    if (Math.abs(vegaDecimal) < 1e-12) return null;

    sigma = sigma - priceDiff / vegaDecimal;
    if (sigma < MIN_SIGMA) sigma = MIN_SIGMA;
    if (sigma > MAX_SIGMA) sigma = MAX_SIGMA;
  }

  return null; // no convergence
}
