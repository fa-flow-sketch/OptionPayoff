import { bsIv } from './black-scholes';
import type { BarData } from './csv-parser';

// GC futures option expiration dates (approximate, for DTE calculations)
const GC_EXPIRY: Record<string, string> = {
  OGF6: '2026-01-15', OGF7: '2027-01-15',
  OGG5: '2025-02-15', OGG6: '2026-02-15', OGG7: '2027-02-15',
  OGH5: '2025-03-15', OGH6: '2026-03-15', OGH7: '2027-03-15',
  OGJ5: '2025-04-15', OGJ6: '2026-04-15', OGJ7: '2027-04-15',
  OGK5: '2025-05-15', OGK6: '2026-05-15', OGK7: '2027-05-15',
  OGM5: '2025-06-15', OGM6: '2026-06-15', OGM7: '2027-06-15',
  OGN5: '2025-07-15', OGN6: '2026-07-15',
  OGQ5: '2025-08-15', OGQ6: '2026-08-15',
  OGU5: '2025-09-15', OGU6: '2026-09-15',
  OGV5: '2025-10-15', OGV6: '2026-10-15',
  OGX5: '2025-11-15', OGX6: '2026-11-15',
  OGZ5: '2025-12-15', OGZ6: '2026-12-15', OGZ7: '2027-12-15',
};

// All known GC contracts with option row counts
export const ALL_GC_CONTRACTS: { symbol: string; label: string; rows: number }[] = [
  { symbol: 'OGF6', label: 'OGF6 (Jan 2026)', rows: 29089 },
  { symbol: 'OGF7', label: 'OGF7 (Jan 2027)', rows: 295 },
  { symbol: 'OGG5', label: 'OGG5 (Feb 2025)', rows: 10120 },
  { symbol: 'OGG6', label: 'OGG6 (Feb 2026)', rows: 37214 },
  { symbol: 'OGG7', label: 'OGG7 (Feb 2027)', rows: 194 },
  { symbol: 'OGH5', label: 'OGH5 (Mar 2025)', rows: 18178 },
  { symbol: 'OGH6', label: 'OGH6 (Mar 2026)', rows: 32642 },
  { symbol: 'OGH7', label: 'OGH7 (Mar 2027)', rows: 130 },
  { symbol: 'OGJ5', label: 'OGJ5 (Apr 2025)', rows: 24076 },
  { symbol: 'OGJ6', label: 'OGJ6 (Apr 2026)', rows: 26754 },
  { symbol: 'OGJ7', label: 'OGJ7 (Apr 2027)', rows: 70 },
  { symbol: 'OGK5', label: 'OGK5 (May 2025)', rows: 29069 },
  { symbol: 'OGK6', label: 'OGK6 (May 2026)', rows: 19681 },
  { symbol: 'OGK7', label: 'OGK7 (May 2027)', rows: 2 },
  { symbol: 'OGM5', label: 'OGM5 (Jun 2025)', rows: 44444 },
  { symbol: 'OGM6', label: 'OGM6 (Jun 2026)', rows: 24619 },
  { symbol: 'OGM7', label: 'OGM7 (Jun 2027)', rows: 14 },
  { symbol: 'OGN5', label: 'OGN5 (Jul 2025)', rows: 27666 },
  { symbol: 'OGN6', label: 'OGN6 (Jul 2026)', rows: 26450 },
  { symbol: 'OGQ5', label: 'OGQ5 (Aug 2025)', rows: 29687 },
  { symbol: 'OGQ6', label: 'OGQ6 (Aug 2026)', rows: 16165 },
  { symbol: 'OGU5', label: 'OGU5 (Sep 2025)', rows: 24522 },
  { symbol: 'OGU6', label: 'OGU6 (Sep 2026)', rows: 4726 },
  { symbol: 'OGV5', label: 'OGV5 (Oct 2025)', rows: 32167 },
  { symbol: 'OGV6', label: 'OGV6 (Oct 2026)', rows: 2688 },
  { symbol: 'OGX5', label: 'OGX5 (Nov 2025)', rows: 27965 },
  { symbol: 'OGX6', label: 'OGX6 (Nov 2026)', rows: 696 },
  { symbol: 'OGZ5', label: 'OGZ5 (Dec 2025)', rows: 45581 },
  { symbol: 'OGZ6', label: 'OGZ6 (Dec 2026)', rows: 3618 },
  { symbol: 'OGZ7', label: 'OGZ7 (Dec 2027)', rows: 9 },
];

interface UnderlyingRow {
  ts_event: string;
  underlying_price: number;
  iv: number;
}

interface OptionRow {
  ts_event: string;
  option_type: string;
  strike: number;
  close: number;
}

// Shared underlying data (all GC contracts share the same underlying)
let cachedUnderlying: UnderlyingRow[] | null = null;

export async function fetchGCUnderlying(): Promise<UnderlyingRow[]> {
  if (cachedUnderlying) return cachedUnderlying;
  const res = await fetch('/data/gc/underlying.json');
  if (!res.ok) throw new Error('No GC underlying data');
  cachedUnderlying = await res.json();
  return cachedUnderlying!;
}

export async function fetchGCOptions(contract: string): Promise<OptionRow[]> {
  const res = await fetch(`/data/gc/${contract}_options.json`);
  if (!res.ok) throw new Error(`No options data for ${contract}`);
  return res.json();
}

export function parseGCData(
  underlying: UnderlyingRow[],
  options: OptionRow[],
  contract: string,
  rfr: number = 0.05
): BarData[] {
  // Index options by timestamp
  const optsByTs = new Map<string, OptionRow[]>();
  for (const opt of options) {
    if (!optsByTs.has(opt.ts_event)) optsByTs.set(opt.ts_event, []);
    optsByTs.get(opt.ts_event)!.push(opt);
  }

  // Build price + IV lookup from underlying
  const priceByTs = new Map<string, number>();
  const ivByTs = new Map<string, number>();
  let lastPrice = 2600;
  let lastIv = 15;

  for (const row of underlying) {
    priceByTs.set(row.ts_event, row.underlying_price);
    ivByTs.set(row.ts_event, row.iv);
    lastPrice = row.underlying_price;
    lastIv = row.iv;
  }

  // Sort all timestamps
  const allTimestamps = [...new Set([
    ...underlying.map(r => r.ts_event),
    ...options.map(o => o.ts_event),
  ])].sort();

  if (allTimestamps.length === 0) return [];

  const expiryDate = GC_EXPIRY[contract];
  const expiryTime = expiryDate ? new Date(expiryDate + 'T23:59:59Z').getTime() : null;

  // Generate continuous hourly timeline, truncated at contract expiry
  const firstTs = new Date(allTimestamps[0]).getTime();
  let lastTs = new Date(allTimestamps[allTimestamps.length - 1]).getTime();
  if (expiryTime && expiryTime < lastTs) {
    lastTs = expiryTime;
  }
  const HOUR_MS = 3600 * 1000;

  const bars: BarData[] = [];

  for (let t = firstTs; t <= lastTs; t += HOUR_MS) {
    // Generate lookup key matching JSON format: "2026-01-01 23:00:00+00:00"
    const tsKey = new Date(t).toISOString().replace('T', ' ').replace('Z', '+00:00').replace(/\.\d{3}/, '');

    // Use pre-computed IV from underlying JSON, or forward-fill
    const rawIv = ivByTs.get(tsKey);
    if (rawIv !== undefined) {
      lastIv = rawIv;
    }

    // Use pre-computed underlying price, or forward-fill
    const rawPrice = priceByTs.get(tsKey);
    if (rawPrice !== undefined) {
      lastPrice = rawPrice;
    }

    bars.push({
      time: new Date(t),
      timestamp: Math.floor(t / 1000),
      close: lastPrice,
      vix: lastIv,
    });
  }

  bars.sort((a, b) => a.timestamp - b.timestamp);
  return bars;
}
