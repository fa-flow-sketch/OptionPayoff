import { bsPrice, bsIv } from './black-scholes';

/** A single option quote row from the database */
export interface OptionQuote {
  ts_event: string;
  option_type: string;
  strike: number;
  close: number;
}

/** Per-leg pricing result with source tracking */
export interface LegPricing {
  price: number;   // option price (actual market or BS theoretical)
  iv: number;      // implied volatility as decimal (e.g. 0.20 = 20%)
  source: 'exact' | 'interpolated' | 'fallback';
}

/** Source counts for transparency */
export interface PricingSourceStats {
  exact: number;
  interpolated: number;
  fallback: number;
}

// Normalize various ISO-ish timestamp formats to "YYYY-MM-DD HH:MM:SS+00:00"
function normalizeTsKey(ts: string): string {
  return ts.replace('T', ' ').replace(/\.\d{3}Z/, '+00:00').replace(/\.\d{3}\+/, '+');
}

function tsKeyFromDate(d: Date): string {
  return d.toISOString().replace('T', ' ').replace('Z', '+00:00').replace(/\.\d{3}/, '');
}

/**
 * Build a timestamp-keyed lookup from raw option quote rows.
 * All three data sources (GC/ES/HSI) use the same OptionQuote shape.
 */
export function buildOptionsLookup(options: OptionQuote[]): Map<string, OptionQuote[]> {
  const map = new Map<string, OptionQuote[]>();
  for (const opt of options) {
    const key = normalizeTsKey(opt.ts_event);
    const bucket = map.get(key);
    if (bucket) {
      bucket.push(opt);
    } else {
      map.set(key, [opt]);
    }
  }
  return map;
}

/**
 * Get pricing (price + IV) for a specific leg at a specific bar.
 *
 * Priority:
 *   1. Exact match — same timestamp, strike, and option type → use market price
 *   2. Strike interpolation — same timestamp and type, different strikes → interpolate IV
 *   3. Fallback — use the bar's ATM IV (bar.vix)
 */
export function getLegPricing(
  optsByTs: Map<string, OptionQuote[]>,
  barTime: Date,
  S: number,
  K: number,
  T: number,
  r: number,
  type: 'call' | 'put',
  fallbackSigma: number,
): LegPricing {
  // Expired or zero time — return intrinsic
  if (T <= 0) {
    const intrinsic = type === 'call' ? Math.max(S - K, 0) : Math.max(K - S, 0);
    return { price: intrinsic, iv: fallbackSigma, source: 'fallback' };
  }

  const tsKey = tsKeyFromDate(barTime);
  const opts = optsByTs.get(tsKey);

  if (!opts || opts.length === 0) {
    const bs = bsPrice(S, K, T, r, fallbackSigma, type);
    return { price: bs.price, iv: fallbackSigma, source: 'fallback' };
  }

  // Filter to same option type
  const sameType = opts.filter(o => o.option_type === type);

  if (sameType.length === 0) {
    const bs = bsPrice(S, K, T, r, fallbackSigma, type);
    return { price: bs.price, iv: fallbackSigma, source: 'fallback' };
  }

  // --- 1. Exact strike match ---
  const exact = sameType.find(o => o.strike === K);
  if (exact) {
    const iv = bsIv(exact.close, S, K, T, r, type);
    if (iv !== null && iv > 0.001 && iv < 5.0) {
      return { price: exact.close, iv, source: 'exact' };
    }
  }

  // --- 2. Strike interpolation ---
  const sorted = [...sameType].sort((a, b) => a.strike - b.strike);

  // Find bracketing strikes
  let lower: typeof sameType[0] | null = null;
  let upper: typeof sameType[0] | null = null;

  for (const opt of sorted) {
    if (opt.strike <= K) lower = opt;
    if (opt.strike >= K && upper === null) upper = opt;
  }

  // Try to compute IVs for both bracket legs
  const computeIv = (opt: typeof sameType[0]): number | null => {
    // For the bracket leg, DTE is the same (they're options on the same underlying)
    return bsIv(opt.close, S, opt.strike, T, r, type);
  };

  if (lower && upper && lower.strike !== upper.strike) {
    const ivLo = computeIv(lower);
    const ivHi = computeIv(upper);
    if (ivLo !== null && ivHi !== null && ivLo > 0.001 && ivHi > 0.001) {
      const frac = (K - lower.strike) / (upper.strike - lower.strike);
      const ivInterp = ivLo + frac * (ivHi - ivLo);
      const bs = bsPrice(S, K, T, r, ivInterp, type);
      return { price: bs.price, iv: ivInterp, source: 'interpolated' };
    }
  }

  // One-sided: nearest available strike
  const nearest = (!lower && upper) ? upper : (lower && !upper) ? lower : null;
  if (nearest) {
    const iv = computeIv(nearest);
    if (iv !== null && iv > 0.001 && iv < 5.0) {
      // Use this IV directly (nearest neighbor, no interpolation possible)
      const bs = bsPrice(S, K, T, r, iv, type);
      return { price: bs.price, iv, source: 'interpolated' };
    }
  }

  // --- 3. Fallback ---
  const bs = bsPrice(S, K, T, r, fallbackSigma, type);
  return { price: bs.price, iv: fallbackSigma, source: 'fallback' };
}
