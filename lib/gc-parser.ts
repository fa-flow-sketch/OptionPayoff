import type { BarData } from './csv-parser';

// GC futures option expiration dates (approximate, for DTE calculations)
const GC_EXPIRY: Record<string, string> = {
  OGF0: '2020-01-15', OGF1: '2021-01-15', OGF2: '2022-01-15', OGF3: '2023-01-15',
  OGF4: '2024-01-15', OGF5: '2025-01-15', OGF6: '2026-01-15', OGF7: '2027-01-15',
  OGG0: '2020-02-15', OGG1: '2021-02-15', OGG2: '2022-02-15', OGG3: '2023-02-15',
  OGG4: '2024-02-15', OGG5: '2025-02-15', OGG6: '2026-02-15', OGG7: '2027-02-15',
  OGH0: '2020-03-15', OGH1: '2021-03-15', OGH2: '2022-03-15', OGH3: '2023-03-15',
  OGH4: '2024-03-15', OGH5: '2025-03-15', OGH6: '2026-03-15', OGH7: '2027-03-15',
  OGJ0: '2020-04-15', OGJ1: '2021-04-15', OGJ2: '2022-04-15', OGJ3: '2023-04-15',
  OGJ4: '2024-04-15', OGJ5: '2025-04-15', OGJ6: '2026-04-15', OGJ7: '2027-04-15',
  OGK0: '2020-05-15', OGK1: '2021-05-15', OGK2: '2022-05-15', OGK3: '2023-05-15',
  OGK4: '2024-05-15', OGK5: '2025-05-15', OGK6: '2026-05-15',
  OGM0: '2020-06-15', OGM1: '2021-06-15', OGM2: '2022-06-15', OGM3: '2023-06-15',
  OGM4: '2024-06-15', OGM5: '2025-06-15', OGM6: '2026-06-15',
  OGN0: '2020-07-15', OGN1: '2021-07-15', OGN2: '2022-07-15', OGN3: '2023-07-15',
  OGN4: '2024-07-15', OGN5: '2025-07-15', OGN6: '2026-07-15',
  OGQ0: '2020-08-15', OGQ1: '2021-08-15', OGQ2: '2022-08-15', OGQ3: '2023-08-15',
  OGQ4: '2024-08-15', OGQ5: '2025-08-15', OGQ6: '2026-08-15',
  OGU0: '2020-09-15', OGU1: '2021-09-15', OGU2: '2022-09-15', OGU3: '2023-09-15',
  OGU4: '2024-09-15', OGU5: '2025-09-15', OGU6: '2026-09-15',
  OGV0: '2020-10-15', OGV1: '2021-10-15', OGV2: '2022-10-15', OGV3: '2023-10-15',
  OGV4: '2024-10-15', OGV5: '2025-10-15', OGV6: '2026-10-15',
  OGX0: '2020-11-15', OGX1: '2021-11-15', OGX2: '2022-11-15', OGX3: '2023-11-15',
  OGX4: '2024-11-15', OGX5: '2025-11-15', OGX6: '2026-11-15',
  OGZ0: '2020-12-15', OGZ1: '2021-12-15', OGZ2: '2022-12-15', OGZ3: '2023-12-15',
  OGZ4: '2024-12-15', OGZ5: '2025-12-15', OGZ6: '2026-12-15',
};

// All known GC contracts with option row counts
export const ALL_GC_CONTRACTS: { symbol: string; label: string; rows: number }[] = [
  { symbol: 'OGF0', label: 'OGF0 (Jan 2020)', rows: 28334 },
  { symbol: 'OGF1', label: 'OGF1 (Jan 2021)', rows: 34104 },
  { symbol: 'OGF2', label: 'OGF2 (Jan 2022)', rows: 24665 },
  { symbol: 'OGF3', label: 'OGF3 (Jan 2023)', rows: 21717 },
  { symbol: 'OGF4', label: 'OGF4 (Jan 2024)', rows: 36812 },
  { symbol: 'OGF5', label: 'OGF5 (Jan 2025)', rows: 43799 },
  { symbol: 'OGF6', label: 'OGF6 (Jan 2026)', rows: 53174 },
  { symbol: 'OGF7', label: 'OGF7 (Jan 2027)', rows: 295 },
  { symbol: 'OGG0', label: 'OGG0 (Feb 2020)', rows: 42617 },
  { symbol: 'OGG1', label: 'OGG1 (Feb 2021)', rows: 39881 },
  { symbol: 'OGG2', label: 'OGG2 (Feb 2022)', rows: 28611 },
  { symbol: 'OGG3', label: 'OGG3 (Feb 2023)', rows: 27974 },
  { symbol: 'OGG4', label: 'OGG4 (Feb 2024)', rows: 45992 },
  { symbol: 'OGG5', label: 'OGG5 (Feb 2025)', rows: 49380 },
  { symbol: 'OGG6', label: 'OGG6 (Feb 2026)', rows: 54674 },
  { symbol: 'OGG7', label: 'OGG7 (Feb 2027)', rows: 194 },
  { symbol: 'OGH0', label: 'OGH0 (Mar 2020)', rows: 36625 },
  { symbol: 'OGH1', label: 'OGH1 (Mar 2021)', rows: 35931 },
  { symbol: 'OGH2', label: 'OGH2 (Mar 2022)', rows: 29302 },
  { symbol: 'OGH3', label: 'OGH3 (Mar 2023)', rows: 24753 },
  { symbol: 'OGH4', label: 'OGH4 (Mar 2024)', rows: 30623 },
  { symbol: 'OGH5', label: 'OGH5 (Mar 2025)', rows: 42146 },
  { symbol: 'OGH6', label: 'OGH6 (Mar 2026)', rows: 37175 },
  { symbol: 'OGH7', label: 'OGH7 (Mar 2027)', rows: 130 },
  { symbol: 'OGJ0', label: 'OGJ0 (Apr 2020)', rows: 60050 },
  { symbol: 'OGJ1', label: 'OGJ1 (Apr 2021)', rows: 43190 },
  { symbol: 'OGJ2', label: 'OGJ2 (Apr 2022)', rows: 46929 },
  { symbol: 'OGJ3', label: 'OGJ3 (Apr 2023)', rows: 36474 },
  { symbol: 'OGJ4', label: 'OGJ4 (Apr 2024)', rows: 43002 },
  { symbol: 'OGJ5', label: 'OGJ5 (Apr 2025)', rows: 58068 },
  { symbol: 'OGJ6', label: 'OGJ6 (Apr 2026)', rows: 29870 },
  { symbol: 'OGK0', label: 'OGK0 (May 2020)', rows: 39474 },
  { symbol: 'OGK1', label: 'OGK1 (May 2021)', rows: 27161 },
  { symbol: 'OGK2', label: 'OGK2 (May 2022)', rows: 27866 },
  { symbol: 'OGK3', label: 'OGK3 (May 2023)', rows: 28115 },
  { symbol: 'OGK4', label: 'OGK4 (May 2024)', rows: 43150 },
  { symbol: 'OGK5', label: 'OGK5 (May 2025)', rows: 59663 },
  { symbol: 'OGK6', label: 'OGK6 (May 2026)', rows: 21094 },
  { symbol: 'OGM0', label: 'OGM0 (Jun 2020)', rows: 49891 },
  { symbol: 'OGM1', label: 'OGM1 (Jun 2021)', rows: 41532 },
  { symbol: 'OGM2', label: 'OGM2 (Jun 2022)', rows: 42232 },
  { symbol: 'OGM3', label: 'OGM3 (Jun 2023)', rows: 43408 },
  { symbol: 'OGM4', label: 'OGM4 (Jun 2024)', rows: 68737 },
  { symbol: 'OGM5', label: 'OGM5 (Jun 2025)', rows: 91126 },
  { symbol: 'OGM6', label: 'OGM6 (Jun 2026)', rows: 26440 },
  { symbol: 'OGN0', label: 'OGN0 (Jul 2020)', rows: 29584 },
  { symbol: 'OGN1', label: 'OGN1 (Jul 2021)', rows: 31103 },
  { symbol: 'OGN2', label: 'OGN2 (Jul 2022)', rows: 23487 },
  { symbol: 'OGN3', label: 'OGN3 (Jul 2023)', rows: 27375 },
  { symbol: 'OGN4', label: 'OGN4 (Jul 2024)', rows: 38436 },
  { symbol: 'OGN5', label: 'OGN5 (Jul 2025)', rows: 51665 },
  { symbol: 'OGN6', label: 'OGN6 (Jul 2026)', rows: 26915 },
  { symbol: 'OGQ0', label: 'OGQ0 (Aug 2020)', rows: 38869 },
  { symbol: 'OGQ1', label: 'OGQ1 (Aug 2021)', rows: 34307 },
  { symbol: 'OGQ2', label: 'OGQ2 (Aug 2022)', rows: 28785 },
  { symbol: 'OGQ3', label: 'OGQ3 (Aug 2023)', rows: 29726 },
  { symbol: 'OGQ4', label: 'OGQ4 (Aug 2024)', rows: 52381 },
  { symbol: 'OGQ5', label: 'OGQ5 (Aug 2025)', rows: 56558 },
  { symbol: 'OGQ6', label: 'OGQ6 (Aug 2026)', rows: 16657 },
  { symbol: 'OGU0', label: 'OGU0 (Sep 2020)', rows: 44147 },
  { symbol: 'OGU1', label: 'OGU1 (Sep 2021)', rows: 26431 },
  { symbol: 'OGU2', label: 'OGU2 (Sep 2022)', rows: 20696 },
  { symbol: 'OGU3', label: 'OGU3 (Sep 2023)', rows: 22519 },
  { symbol: 'OGU4', label: 'OGU4 (Sep 2024)', rows: 42186 },
  { symbol: 'OGU5', label: 'OGU5 (Sep 2025)', rows: 43312 },
  { symbol: 'OGU6', label: 'OGU6 (Sep 2026)', rows: 4775 },
  { symbol: 'OGV0', label: 'OGV0 (Oct 2020)', rows: 44738 },
  { symbol: 'OGV1', label: 'OGV1 (Oct 2021)', rows: 27016 },
  { symbol: 'OGV2', label: 'OGV2 (Oct 2022)', rows: 23230 },
  { symbol: 'OGV3', label: 'OGV3 (Oct 2023)', rows: 25241 },
  { symbol: 'OGV4', label: 'OGV4 (Oct 2024)', rows: 54870 },
  { symbol: 'OGV5', label: 'OGV5 (Oct 2025)', rows: 58551 },
  { symbol: 'OGV6', label: 'OGV6 (Oct 2026)', rows: 2701 },
  { symbol: 'OGX0', label: 'OGX0 (Nov 2020)', rows: 35404 },
  { symbol: 'OGX1', label: 'OGX1 (Nov 2021)', rows: 23091 },
  { symbol: 'OGX2', label: 'OGX2 (Nov 2022)', rows: 23547 },
  { symbol: 'OGX3', label: 'OGX3 (Nov 2023)', rows: 32273 },
  { symbol: 'OGX4', label: 'OGX4 (Nov 2024)', rows: 42917 },
  { symbol: 'OGX5', label: 'OGX5 (Nov 2025)', rows: 70762 },
  { symbol: 'OGX6', label: 'OGX6 (Nov 2026)', rows: 699 },
  { symbol: 'OGZ0', label: 'OGZ0 (Dec 2020)', rows: 61008 },
  { symbol: 'OGZ1', label: 'OGZ1 (Dec 2021)', rows: 42372 },
  { symbol: 'OGZ2', label: 'OGZ2 (Dec 2022)', rows: 36541 },
  { symbol: 'OGZ3', label: 'OGZ3 (Dec 2023)', rows: 53349 },
  { symbol: 'OGZ4', label: 'OGZ4 (Dec 2024)', rows: 87356 },
  { symbol: 'OGZ5', label: 'OGZ5 (Dec 2025)', rows: 104142 },
  { symbol: 'OGZ6', label: 'OGZ6 (Dec 2026)', rows: 3735 },
].sort((a, b) => (GC_EXPIRY[a.symbol] ?? '').localeCompare(GC_EXPIRY[b.symbol] ?? ''));

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

// Per-contract underlying data (each contract uses its specific gc_future price)
const underlyingCache = new Map<string, UnderlyingRow[]>();

export async function fetchGCUnderlying(contract: string): Promise<UnderlyingRow[]> {
  const cached = underlyingCache.get(contract);
  if (cached) return cached;
  const res = await fetch(`/data/gc/${contract}_underlying.json`);
  if (!res.ok) throw new Error(`No underlying data for ${contract}`);
  const data = await res.json();
  underlyingCache.set(contract, data);
  return data;
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
