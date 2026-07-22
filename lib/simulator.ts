import { bsPrice, bsIv, type BSResult } from './black-scholes';
import type { BarData } from './csv-parser';
import { type ContractSpec, CONTRACT_SPECS } from './contract-specs';
import { getLegPricing, type OptionQuote, type LegPricing, type PricingSourceStats } from './volatility-surface';

export interface Leg {
  id: string;
  type: 'call' | 'put';
  position: 'long' | 'short';
  quantity: number;
  strike: number;
  dte: number; // days to expiry at entry
}

export type HedgeMode = 'delta_band' | 'scheduled' | 'interval';

export interface SimParams {
  ivOverride: number | null; // null = use VIX
  riskFreeRate: number; // decimal e.g. 0.05
  deltaBand: number; // e.g. 0.10
  maxHedgesPerDay: number;
  mgcSlippage: number; // $ per MGC contract
  entryBar: number;
  hedgeMode: HedgeMode; // when to check for hedging
  hedgeScheduledTimes: string[]; // e.g. ['13:30','15:00'] — for scheduled mode
  hedgeIntervalHours: number; // e.g. 1 — for interval mode
  takeProfitPct: number | null; // e.g. 0.50 = TP at 50% of premium. null = disabled
  stopHedgeDeltaLo: number | null; // e.g. -0.05 — don't hedge if delta above this AND below stopHedgeDeltaHi. null = disabled
  stopHedgeDeltaHi: number | null; // e.g. 0.05  — don't hedge if delta below this AND above stopHedgeDeltaLo
  stopHedgeTime: string | null; // e.g. "14:00" (UTC) — no hedging after this time. null = disabled
  contractSpec: ContractSpec; // GC or ES — determines multipliers, defaults to GC
}

export interface HedgeEvent {
  barIndex: number;
  datetime: Date;
  gcPrice: number;
  mgcContracts: number; // positive = buy, negative = sell
  direction: string;
  cumulativeMgcPosition: number; // in MGC contracts
  slippageCost: number; // transaction cost for this trade
  cumulativeSlippage: number; // total slippage so far
  hedgePnl: number; // P&L from MGC positions at this bar
  netHedgeCost: number; // cumSlippage - hedgePnl (positive = net cost, negative = net gain)
}

export interface BarResult {
  barIndex: number;
  datetime: Date;
  close: number;
  iv: number;
  netDelta: number; // in GC-delta units (per 100oz)
  netGamma: number;
  netVega: number;
  netTheta: number;
  effectiveDelta: number; // net delta + hedge
  hedgeFired: boolean;
  mgcQty: number; // MGC contracts traded this bar (0 if no hedge)
  optionPnl: number;
  hedgePnl: number;
  totalHedgeCost: number;
  netPnl: number;
  hedgeOz: number; // cumulative hedge position in oz
}

export interface LegPnl {
  legLabel: string; // e.g. "Short Call 4570"
  type: 'call' | 'put';
  position: 'long' | 'short';
  strike: number;
  entryValue: number; // option value at entry (per contract, per oz)
  currentValue: number; // option value now
  premium: number; // premium collected/paid (with sign: positive = collected)
  pnl: number; // current P&L for this leg
}

export interface SimResult {
  bars: BarResult[];
  hedgeEvents: HedgeEvent[];
  premiumCollected: number;
  costToClose: number; // current MTM value of options (what you'd pay to buy them back)
  finalOptionPnl: number; // = premiumCollected - costToClose
  finalHedgePnl: number;
  finalNetPnl: number;
  totalHedgeCost: number;
  numHedges: number;
  cumulativeTheta: number;
  hedgeEfficiency: number;
  legPnls: LegPnl[];
  tpHit: boolean; // whether take-profit was triggered
  tpBar: number | null; // bar index where TP fired
  tpTime: Date | null; // datetime when TP fired
  tpPnl: number | null; // net P&L at TP
  pricingSources: PricingSourceStats; // how many leg-bar pairs used each source
}

interface HedgeTrade {
  barIndex: number;
  mgcContracts: number;
  priceAtEntry: number;
}

export function runSimulation(
  bars: BarData[],
  legs: Leg[],
  params: SimParams,
  optionsByTs?: Map<string, OptionQuote[]>,
): SimResult {
  const startIdx = Math.max(0, Math.min(params.entryBar, bars.length - 1));
  const simBars = bars.slice(startIdx);

  if (simBars.length === 0 || legs.length === 0) {
    return {
      bars: [],
      hedgeEvents: [],
      premiumCollected: 0,
      costToClose: 0,
      finalOptionPnl: 0,
      finalHedgePnl: 0,
      finalNetPnl: 0,
      totalHedgeCost: 0,
      numHedges: 0,
      cumulativeTheta: 0,
      hedgeEfficiency: 0,
      legPnls: [],
      tpHit: false,
      tpBar: null,
      tpTime: null,
      tpPnl: null,
      pricingSources: { exact: 0, interpolated: 0, fallback: 0 },
    };
  }

  const r = params.riskFreeRate;
  const spec = params.contractSpec || CONTRACT_SPECS.GC;
  const mult = spec.underlyingMultiplier;
  const hedgeMult = spec.hedgeMultiplier;
  const results: BarResult[] = [];
  const hedgeEvents: HedgeEvent[] = [];
  const hedgeTrades: HedgeTrade[] = [];

  let hedgeOz = 0;
  let totalHedgeCost = 0;
  let numHedges = 0;
  let cumulativeMgcContracts = 0;

  // Pricing source counters for transparency
  const pricingSources: PricingSourceStats = { exact: 0, interpolated: 0, fallback: 0 };

  // Compute initial option values for premium calculation
  const entryPrice = simBars[0]?.close ?? 0;
  const fallbackSigma = params.ivOverride !== null ? params.ivOverride : ((simBars[0]?.vix ?? 15) / 100);

  let premiumCollected = 0;
  const legEntryValues: number[] = [];
  const legEntryIv: number[] = [];

  for (const leg of legs) {
    const T0 = leg.dte / 365;
    const pricing = optionsByTs
      ? getLegPricing(optionsByTs, simBars[0]?.time ?? new Date(), entryPrice, leg.strike, T0, r, leg.type, fallbackSigma)
      : { price: bsPrice(entryPrice, leg.strike, T0, r, fallbackSigma, leg.type).price, iv: fallbackSigma, source: 'fallback' as const };
    const posSign = leg.position === 'long' ? 1 : -1;
    // Short = collect premium (positive), Long = pay premium (negative)
    premiumCollected += -posSign * leg.quantity * mult * pricing.price;
    legEntryValues.push(pricing.price);
    legEntryIv.push(pricing.iv);
  }

  let cumulativeThetaDecay = 0;
  let lastDayStr = '';
  let hedgesToday = 0;
  let tpHit = false;
  let tpBar: number | null = null;
  let tpTime: Date | null = null;
  let tpPnl: number | null = null;
  let positionClosed = false; // after TP, no more trading

  const tpTarget = params.takeProfitPct !== null && Math.abs(premiumCollected) > 0
    ? Math.abs(premiumCollected) * params.takeProfitPct
    : null;

  for (let i = 0; i < simBars.length; i++) {
    const bar = simBars[i];
    if (!bar) continue;
    const S = bar.close;
    const sigma = params.ivOverride !== null ? params.ivOverride : (bar.vix / 100);
    const daysElapsed = i; // each bar is 1 day

    // Reset daily hedge counter
    const dayStr = bar.time.toISOString().slice(0, 10);
    if (dayStr !== lastDayStr) {
      hedgesToday = 0;
      lastDayStr = dayStr;
    }

    let netDelta = 0;
    let netGamma = 0;
    let netVega = 0;
    let netTheta = 0;
    let currentOptionValue = 0;

    for (let j = 0; j < legs.length; j++) {
      const leg = legs[j];
      if (!leg) continue;
      const T = Math.max((leg.dte - daysElapsed) / 365, 0);
      const posSign = leg.position === 'long' ? 1 : -1;
      const qty = leg.quantity;

      // Get per-leg pricing via volatility surface when options data is available
      let legPrice: number;
      let legSigma: number;
      if (optionsByTs) {
        const pricing = getLegPricing(optionsByTs, bar.time, S, leg.strike, T, r, leg.type, sigma);
        legPrice = pricing.price;
        legSigma = pricing.iv;
        pricingSources[pricing.source]++;
      } else {
        legPrice = bsPrice(S, leg.strike, T, r, sigma, leg.type).price;
        legSigma = sigma;
        pricingSources.fallback++;
      }

      const bs = bsPrice(S, leg.strike, T, r, legSigma, leg.type);

      netDelta += posSign * qty * bs.delta;
      netGamma += posSign * qty * bs.gamma;
      netVega += posSign * qty * bs.vega;
      netTheta += posSign * qty * bs.theta * mult;

      currentOptionValue += posSign * qty * mult * legPrice;
    }

    // netTheta is daily rate, each bar is 1 day
    cumulativeThetaDecay += netTheta;

    // Option P&L: premium collected + current position value
    const optionPnl = premiumCollected + currentOptionValue;

    // Net delta in contract units → position delta
    const netDeltaUnits = netDelta * mult;
    const effectiveDeltaUnits = netDeltaUnits + hedgeOz;
    const effectiveDelta = effectiveDeltaUnits / mult;

    // Hedge check
    let hedgeFired = false;
    let mgcQtyThisBar = 0;

    // Determine if this bar is eligible for hedge check based on mode
    let hedgeEligible = false;
    if (params.hedgeMode === 'delta_band') {
      // Check every bar
      hedgeEligible = true;
    } else if (params.hedgeMode === 'scheduled') {
      // Check only at scheduled times
      const barHour = bar.time.getUTCHours();
      const barMinute = bar.time.getUTCMinutes();
      const barTimeStr = `${barHour.toString().padStart(2,'0')}:${barMinute.toString().padStart(2,'0')}`;
      hedgeEligible = params.hedgeScheduledTimes.some((t: string) => t === barTimeStr);
    } else if (params.hedgeMode === 'interval') {
      // Check every N hours from start
      const intervalBars = Math.max(1, params.hedgeIntervalHours);
      hedgeEligible = i % intervalBars === 0;
    }

    // Stop-hedge delta range: if set, skip hedging when delta is within the safe zone
    // Only active when BOTH values are non-null (explicitly configured)
    const stopHedgeActive = params.stopHedgeDeltaLo !== null && params.stopHedgeDeltaHi !== null;
    const deltaInSafeZone = stopHedgeActive && effectiveDelta >= params.stopHedgeDeltaLo! && effectiveDelta <= params.stopHedgeDeltaHi!;

    // Stop-hedge time: skip hedging if current bar time >= stop time
    let pastStopTime = false;
    if (params.stopHedgeTime) {
      const barHour = bar.time.getUTCHours();
      const barMinute = bar.time.getUTCMinutes();
      const barTimeStr = `${barHour.toString().padStart(2, '0')}:${barMinute.toString().padStart(2, '0')}`;
      pastStopTime = barTimeStr >= params.stopHedgeTime;
    }

    if (!positionClosed && !pastStopTime && hedgeEligible && Math.abs(effectiveDelta) > params.deltaBand && !deltaInSafeZone && hedgesToday < params.maxHedgesPerDay) {
      // How many MGC contracts to trade? Each MGC = 10 oz
      const mgcContracts = Math.round(-effectiveDeltaUnits / hedgeMult);
      if (mgcContracts !== 0) {
        hedgeOz += mgcContracts * hedgeMult;
        hedgesToday += 1;
        numHedges += 1;
        const cost = Math.abs(mgcContracts) * params.mgcSlippage;
        totalHedgeCost += cost;
        cumulativeMgcContracts += mgcContracts;
        mgcQtyThisBar = mgcContracts;
        hedgeFired = true;

        hedgeTrades.push({
          barIndex: i,
          mgcContracts,
          priceAtEntry: S,
        });

        hedgeEvents.push({
          barIndex: i,
          datetime: bar.time,
          gcPrice: S,
          mgcContracts,
          direction: mgcContracts > 0 ? 'BUY' : 'SELL',
          cumulativeMgcPosition: cumulativeMgcContracts,
          slippageCost: cost,
          cumulativeSlippage: totalHedgeCost,
          hedgePnl: 0, // filled below after hedge P&L calc
          netHedgeCost: 0, // filled below
        });
      }
    }

    // Hedge P&L = sum of all open MGC trades: qty * 10oz * (current - entry)
    let hedgePnl = 0;
    for (const trade of hedgeTrades) {
      hedgePnl += trade.mgcContracts * hedgeMult * (S - trade.priceAtEntry);
    }

    const rawNetPnl: number = optionPnl + hedgePnl - totalHedgeCost;

    // Check take-profit: if option P&L >= TP target, close positions
    if (!positionClosed && tpTarget !== null && rawNetPnl >= tpTarget) {
      tpHit = true;
      tpBar = i;
      tpTime = bar.time;
      tpPnl = rawNetPnl;
      positionClosed = true;
    }

    const netPnl: number = positionClosed ? (tpPnl ?? rawNetPnl) : rawNetPnl;

    // Update hedge P&L in hedge events
    if (hedgeFired && hedgeEvents.length > 0) {
      const lastEvent = hedgeEvents[hedgeEvents.length - 1];
      if (lastEvent) {
        lastEvent.hedgePnl = hedgePnl;
        // Net hedge cost = total slippage paid - hedge P&L
        // If hedgePnl is negative (MGC lost money), net cost is higher
        // If hedgePnl is positive (MGC made money), net cost is lower
        lastEvent.netHedgeCost = totalHedgeCost - hedgePnl;
      }
    }

    results.push({
      barIndex: i,
      datetime: bar.time,
      close: S,
      iv: sigma * 100,
      netDelta,
      netGamma,
      netVega,
      netTheta,
      effectiveDelta: (netDeltaUnits + hedgeOz) / mult,
      hedgeFired,
      mgcQty: mgcQtyThisBar,
      optionPnl,
      hedgePnl,
      totalHedgeCost,
      netPnl,
      hedgeOz,
    });
  }

  const lastBar = results.length > 0 ? results[results.length - 1] : null;
  const finalPnl = lastBar?.netPnl ?? 0;
  const finalOptionPnl = lastBar?.optionPnl ?? 0;
  const finalHedgePnl = lastBar?.hedgePnl ?? 0;

  // Compute per-leg P&L at the final bar
  const lastPrice = lastBar?.close ?? entryPrice;
  const lastFallbackSigma = params.ivOverride !== null ? params.ivOverride : ((simBars[simBars.length - 1]?.vix ?? 15) / 100);
  const totalDaysElapsed = simBars.length - 1;
  const lastBarTime = simBars[simBars.length - 1]?.time ?? new Date();
  const legPnls: LegPnl[] = legs.map((leg, j) => {
    const posSign = leg.position === 'long' ? 1 : -1;
    const T = Math.max((leg.dte - totalDaysElapsed) / 365, 0);
    const entryVal = legEntryValues[j] ?? 0;
    // Use volatility surface at the last bar for current value
    let currentVal: number;
    if (optionsByTs) {
      const pricing = getLegPricing(optionsByTs, lastBarTime, lastPrice, leg.strike, T, r, leg.type, lastFallbackSigma);
      currentVal = pricing.price;
    } else {
      currentVal = bsPrice(lastPrice, leg.strike, T, r, lastFallbackSigma, leg.type).price;
    }
    // Premium: short collects (positive), long pays (negative)
    const legPremium = -posSign * leg.quantity * mult * entryVal;
    const pnl = legPremium + posSign * leg.quantity * mult * currentVal;
    return {
      legLabel: `${leg.position === 'short' ? 'Short' : 'Long'} ${leg.type === 'call' ? 'Call' : 'Put'} ${leg.strike}`,
      type: leg.type,
      position: leg.position,
      strike: leg.strike,
      entryValue: entryVal,
      currentValue: currentVal,
      premium: legPremium,
      pnl,
    };
  });

  // Hedge efficiency: how much of the premium survived after all costs
  const hedgeEfficiency = Math.abs(premiumCollected) > 0
    ? (finalPnl / Math.abs(premiumCollected)) * 100
    : 0;

  // Cost to close = absolute value of current option positions
  // For short: you need to buy back (positive cost)
  // For long: you can sell (positive value)
  // costToClose = sum of current option values (unsigned, for display)
  let costToClose = 0;
  for (const lp of legPnls) {
    // For short positions: cost to close = current value * qty * 100
    // For long positions: value to sell = current value * qty * 100
    const legQty = legs.find(l => l.strike === lp.strike && l.type === lp.type)?.quantity ?? 1;
    costToClose += lp.currentValue * legQty * mult;
  }

  return {
    bars: results,
    hedgeEvents,
    premiumCollected,
    costToClose,
    finalOptionPnl,
    finalHedgePnl,
    finalNetPnl: finalPnl,
    totalHedgeCost,
    numHedges,
    cumulativeTheta: cumulativeThetaDecay,
    hedgeEfficiency,
    legPnls,
    tpHit,
    tpBar,
    tpTime,
    tpPnl,
    pricingSources,
  };
}

// Sensitivity analysis: run simulation for grid of band × maxHedges
export function runSensitivityMatrix(
  bars: BarData[],
  legs: Leg[],
  baseParams: SimParams,
  bands: number[],
  maxHedgesArr: number[],
  optionsByTs?: Map<string, OptionQuote[]>,
): number[][] {
  const matrix: number[][] = [];
  for (const band of bands) {
    const row: number[] = [];
    for (const maxH of maxHedgesArr) {
      const p = { ...baseParams, deltaBand: band, maxHedgesPerDay: maxH };
      const result = runSimulation(bars, legs, p, optionsByTs);
      row.push(result.finalNetPnl);
    }
    matrix.push(row);
  }
  return matrix;
}