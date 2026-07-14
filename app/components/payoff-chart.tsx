'use client';

import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { type Leg } from '@/lib/simulator';
import { bsPrice } from '@/lib/black-scholes';

interface PayoffChartProps {
  legs: Leg[];
  currentATM: number;
  iv: number; // decimal e.g. 0.25
  rfRate: number; // decimal e.g. 0.05
  onUpdateLegStrike?: (legId: string, newStrike: number) => void;
}

// Chart layout constants
const MARGIN = { top: 20, right: 20, bottom: 30, left: 60 };
const CHART_HEIGHT = 220;

export default function PayoffChart({ legs, currentATM, iv, rfRate, onUpdateLegStrike }: PayoffChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(500);

  // Zoom level: 1 = default (±15%), smaller = zoomed in
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState(0);

  // Drag state for panning
  const panDrag = useRef<{ active: boolean; startX: number; startOffset: number }>({ active: false, startX: 0, startOffset: 0 });
  // Drag state for strike dots
  const dotDrag = useRef<{ active: boolean; legId: string; startX: number; startStrike: number }>({ active: false, legId: '', startX: 0, startStrike: 0 });

  // Observe container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries: ResizeObserverEntry[]) => {
      const w = entries[0]?.contentRect?.width;
      if (w && w > 0) setContainerWidth(w);
    });
    obs.observe(el);
    setContainerWidth(el.clientWidth || 500);
    return () => obs.disconnect();
  }, []);

  // Plot area dimensions
  const plotW = containerWidth - MARGIN.left - MARGIN.right;
  const plotH = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;

  // Entry premiums
  const entryPremiums = useMemo(() => {
    return (legs ?? []).map((leg: Leg) => {
      if (!leg) return 0;
      const bs = bsPrice(currentATM, leg.strike, leg.dte / 365, rfRate, iv, leg.type);
      return bs.price;
    });
  }, [legs, currentATM, iv, rfRate]);

  // Payoff at price
  const payoffAt = useCallback((price: number) => {
    let pnl = 0;
    for (let i = 0; i < (legs ?? []).length; i++) {
      const leg = legs[i];
      if (!leg) continue;
      const posSign = leg.position === 'long' ? 1 : -1;
      const intrinsic = leg.type === 'call'
        ? Math.max(0, price - leg.strike)
        : Math.max(0, leg.strike - price);
      pnl += posSign * (intrinsic - entryPremiums[i]) * leg.quantity * 100;
    }
    return pnl;
  }, [legs, entryPremiums]);

  // Price range
  const baseRange = currentATM * 0.15;
  const halfRange = baseRange * zoomLevel;
  const priceLo = currentATM - halfRange + panOffset;
  const priceHi = currentATM + halfRange + panOffset;

  // Generate data points
  const data = useMemo(() => {
    const pts: { price: number; pnl: number }[] = [];
    const steps = 300;
    const step = (priceHi - priceLo) / steps;
    for (let i = 0; i <= steps; i++) {
      const p = priceLo + i * step;
      pts.push({ price: p, pnl: payoffAt(p) });
    }
    return pts;
  }, [priceLo, priceHi, payoffAt]);

  // Y domain
  const pnlValues = data.map(d => d.pnl);
  const minPnl = Math.min(...pnlValues);
  const maxPnl = Math.max(...pnlValues);
  const yPad = Math.max(Math.abs(maxPnl - minPnl) * 0.2, 200);
  const yLo = minPnl - yPad;
  const yHi = maxPnl + yPad;

  // Scale functions
  const xScale = useCallback((price: number) => {
    return MARGIN.left + ((price - priceLo) / (priceHi - priceLo)) * plotW;
  }, [priceLo, priceHi, plotW]);

  const yScale = useCallback((pnl: number) => {
    return MARGIN.top + plotH - ((pnl - yLo) / (yHi - yLo)) * plotH;
  }, [yLo, yHi, plotH]);

  const xInverse = useCallback((px: number) => {
    return priceLo + ((px - MARGIN.left) / plotW) * (priceHi - priceLo);
  }, [priceLo, priceHi, plotW]);

  // Build SVG path for the payoff line
  const linePath = useMemo(() => {
    if (data.length === 0) return '';
    return data.map((d, i) => {
      const x = xScale(d.price);
      const y = yScale(d.pnl);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }, [data, xScale, yScale]);

  // Build fill area path (fill to y=0 line)
  const zeroY = yScale(0);
  const fillPathAbove = useMemo(() => {
    // Positive area: clip above zero
    const pts = data.map(d => ({ x: xScale(d.price), y: yScale(Math.max(d.pnl, 0)) }));
    if (pts.length === 0) return '';
    let path = `M${pts[0].x.toFixed(1)},${zeroY.toFixed(1)}`;
    pts.forEach(p => { path += ` L${p.x.toFixed(1)},${p.y.toFixed(1)}`; });
    path += ` L${pts[pts.length - 1].x.toFixed(1)},${zeroY.toFixed(1)} Z`;
    return path;
  }, [data, xScale, yScale, zeroY]);

  const fillPathBelow = useMemo(() => {
    const pts = data.map(d => ({ x: xScale(d.price), y: yScale(Math.min(d.pnl, 0)) }));
    if (pts.length === 0) return '';
    let path = `M${pts[0].x.toFixed(1)},${zeroY.toFixed(1)}`;
    pts.forEach(p => { path += ` L${p.x.toFixed(1)},${p.y.toFixed(1)}`; });
    path += ` L${pts[pts.length - 1].x.toFixed(1)},${zeroY.toFixed(1)} Z`;
    return path;
  }, [data, xScale, yScale, zeroY]);

  // X-axis ticks
  const xTicks = useMemo(() => {
    const range = priceHi - priceLo;
    let step = 50;
    if (range > 1000) step = 200;
    else if (range > 500) step = 100;
    else if (range > 200) step = 50;
    else if (range > 100) step = 25;
    else step = 10;
    const ticks: number[] = [];
    const start = Math.ceil(priceLo / step) * step;
    for (let v = start; v <= priceHi; v += step) ticks.push(v);
    return ticks;
  }, [priceLo, priceHi]);

  // Y-axis ticks
  const yTicks = useMemo(() => {
    const range = yHi - yLo;
    let step = 500;
    if (range > 50000) step = 10000;
    else if (range > 20000) step = 5000;
    else if (range > 10000) step = 2000;
    else if (range > 5000) step = 1000;
    else if (range > 2000) step = 500;
    else if (range > 1000) step = 200;
    else step = 100;
    const ticks: number[] = [];
    const start = Math.ceil(yLo / step) * step;
    for (let v = start; v <= yHi; v += step) ticks.push(v);
    return ticks;
  }, [yLo, yHi]);

  // Leg strike dots with P&L at that strike
  const strikeDots = useMemo(() => {
    return (legs ?? []).map((leg: Leg, i: number) => {
      const pnl = payoffAt(leg.strike);
      return {
        legId: leg.id,
        strike: leg.strike,
        pnl,
        x: xScale(leg.strike),
        y: yScale(pnl),
        label: `${leg.position === 'short' ? 'S' : 'L'} ${leg.type === 'call' ? 'C' : 'P'} ${leg.strike}`,
        type: leg.type,
      };
    });
  }, [legs, payoffAt, xScale, yScale]);

  // Hover state for tooltip
  const [hoverInfo, setHoverInfo] = useState<{ x: number; y: number; price: number; pnl: number } | null>(null);

  // --- Event handlers ---

  // Zoom via scroll wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1.15 : 0.87; // scroll down = zoom out, up = zoom in
    setZoomLevel(prev => Math.max(0.1, Math.min(5, prev * delta)));
  }, []);

  // Pan via background drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start pan if not clicking on a dot
    const target = e.target as HTMLElement;
    if (target.closest('.strike-dot')) return;
    panDrag.current = { active: true, startX: e.clientX, startOffset: panOffset };
  }, [panOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Dot drag takes priority
    if (dotDrag.current.active && onUpdateLegStrike) {
      const dx = e.clientX - dotDrag.current.startX;
      const pricePerPx = (priceHi - priceLo) / plotW;
      const newStrike = Math.round((dotDrag.current.startStrike + dx * pricePerPx) / 5) * 5; // snap to $5
      onUpdateLegStrike(dotDrag.current.legId, newStrike);
      return;
    }

    // Pan drag
    if (panDrag.current.active) {
      const dx = e.clientX - panDrag.current.startX;
      const pricePerPx = (priceHi - priceLo) / plotW;
      setPanOffset(panDrag.current.startOffset - dx * pricePerPx);
      return;
    }

    // Hover tooltip
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    if (mx >= MARGIN.left && mx <= MARGIN.left + plotW && my >= MARGIN.top && my <= MARGIN.top + plotH) {
      const price = xInverse(mx);
      const pnl = payoffAt(price);
      setHoverInfo({ x: mx, y: yScale(pnl), price, pnl });
    } else {
      setHoverInfo(null);
    }
  }, [priceLo, priceHi, plotW, plotH, panOffset, xInverse, payoffAt, yScale, onUpdateLegStrike]);

  const handleMouseUp = useCallback(() => {
    panDrag.current.active = false;
    dotDrag.current.active = false;
  }, []);

  const handleMouseLeave = useCallback(() => {
    panDrag.current.active = false;
    dotDrag.current.active = false;
    setHoverInfo(null);
  }, []);

  // Dot drag start
  const handleDotMouseDown = useCallback((e: React.MouseEvent, legId: string, strike: number) => {
    e.stopPropagation();
    e.preventDefault();
    dotDrag.current = { active: true, legId, startX: e.clientX, startStrike: strike };
  }, []);

  // Global mouse up
  useEffect(() => {
    const up = () => {
      panDrag.current.active = false;
      dotDrag.current.active = false;
    };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);

  // Current ATM P&L
  const currentPnl = payoffAt(currentATM);

  if ((legs ?? []).length === 0) {
    return (
      <div className="rounded-lg bg-muted/20 border border-border/30 p-4 mt-3">
        <p className="text-xs text-muted-foreground text-center">Add legs to see the payoff diagram</p>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">Expiry Payoff Diagram</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">@ ATM ${currentATM.toFixed(0)}:</span>
          <span className={`text-xs font-mono font-bold ${currentPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ${currentPnl.toLocaleString()}
          </span>
          <span className="text-[10px] text-muted-foreground/60 ml-1">Scroll zoom · Drag pan · Drag dots</span>
        </div>
      </div>
      <div
        ref={containerRef}
        className="rounded-lg bg-muted/10 border border-border/30 select-none relative"
        style={{ cursor: dotDrag.current.active ? 'ew-resize' : panDrag.current.active ? 'grabbing' : 'crosshair' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <svg
          ref={svgRef}
          width={containerWidth}
          height={CHART_HEIGHT}
          className="block"
        >
          {/* Clip path for plot area */}
          <defs>
            <clipPath id="plotClip">
              <rect x={MARGIN.left} y={MARGIN.top} width={plotW} height={plotH} />
            </clipPath>
          </defs>

          {/* Grid lines */}
          {xTicks.map(v => (
            <line key={`xg${v}`} x1={xScale(v)} y1={MARGIN.top} x2={xScale(v)} y2={MARGIN.top + plotH} stroke="#333" strokeDasharray="3 3" strokeOpacity={0.4} />
          ))}
          {yTicks.map(v => (
            <line key={`yg${v}`} x1={MARGIN.left} y1={yScale(v)} x2={MARGIN.left + plotW} y2={yScale(v)} stroke="#333" strokeDasharray="3 3" strokeOpacity={0.4} />
          ))}

          {/* Zero line */}
          {zeroY >= MARGIN.top && zeroY <= MARGIN.top + plotH && (
            <line x1={MARGIN.left} y1={zeroY} x2={MARGIN.left + plotW} y2={zeroY} stroke="#666" strokeWidth={1} />
          )}

          {/* Fill areas */}
          <g clipPath="url(#plotClip)">
            <path d={fillPathAbove} fill="#22c55e" fillOpacity={0.12} />
            <path d={fillPathBelow} fill="#ef4444" fillOpacity={0.12} />
            {/* Payoff line */}
            <path d={linePath} fill="none" stroke="#F5A623" strokeWidth={2} />
          </g>

          {/* ATM reference line */}
          {currentATM >= priceLo && currentATM <= priceHi && (
            <g>
              <line x1={xScale(currentATM)} y1={MARGIN.top} x2={xScale(currentATM)} y2={MARGIN.top + plotH} stroke="#F5A623" strokeDasharray="4 2" strokeOpacity={0.6} />
              <text x={xScale(currentATM)} y={MARGIN.top - 4} fill="#F5A623" fontSize={9} textAnchor="middle" fontFamily="monospace">ATM</text>
            </g>
          )}

          {/* Strike reference lines (dashed) */}
          {strikeDots.map((dot, i) => (
            dot.strike >= priceLo && dot.strike <= priceHi && (
              <line
                key={`sl${i}`}
                x1={xScale(dot.strike)}
                y1={MARGIN.top}
                x2={xScale(dot.strike)}
                y2={MARGIN.top + plotH}
                stroke={dot.type === 'call' ? '#60a5fa' : '#f472b6'}
                strokeDasharray="2 3"
                strokeOpacity={0.35}
              />
            )
          ))}

          {/* Draggable strike dots */}
          {strikeDots.map((dot, i) => {
            const inView = dot.x >= MARGIN.left && dot.x <= MARGIN.left + plotW;
            if (!inView) return null;
            const clampedY = Math.max(MARGIN.top + 4, Math.min(MARGIN.top + plotH - 4, dot.y));
            return (
              <g
                key={`dot${i}`}
                className="strike-dot"
                style={{ cursor: 'ew-resize' }}
                onMouseDown={(e: React.MouseEvent) => handleDotMouseDown(e, dot.legId, dot.strike)}
              >
                {/* Larger invisible hit area */}
                <circle cx={dot.x} cy={clampedY} r={14} fill="transparent" />
                {/* Outer glow */}
                <circle cx={dot.x} cy={clampedY} r={8} fill="#ef4444" fillOpacity={0.15} />
                {/* Red dot */}
                <circle cx={dot.x} cy={clampedY} r={5} fill="#ef4444" stroke="#fff" strokeWidth={1.5} />
                {/* Label above */}
                <rect
                  x={dot.x - 28}
                  y={clampedY - 24}
                  width={56}
                  height={15}
                  rx={3}
                  fill="hsl(228, 14%, 14%)"
                  fillOpacity={0.9}
                  stroke="#ef4444"
                  strokeWidth={0.5}
                  strokeOpacity={0.5}
                />
                <text x={dot.x} y={clampedY - 13} fill="#ef4444" fontSize={9} textAnchor="middle" fontFamily="monospace" fontWeight="bold">
                  {dot.label}
                </text>
              </g>
            );
          })}

          {/* Hover crosshair + tooltip */}
          {hoverInfo && !panDrag.current.active && !dotDrag.current.active && (
            <g>
              <line x1={hoverInfo.x} y1={MARGIN.top} x2={hoverInfo.x} y2={MARGIN.top + plotH} stroke="#aaa" strokeDasharray="2 2" strokeOpacity={0.5} />
              <circle cx={hoverInfo.x} cy={hoverInfo.y} r={3} fill="#F5A623" />
              {/* Tooltip box */}
              <g transform={`translate(${hoverInfo.x + (hoverInfo.x > MARGIN.left + plotW - 100 ? -95 : 10)}, ${Math.max(MARGIN.top, hoverInfo.y - 30)})`}>
                <rect width={85} height={34} rx={4} fill="hsl(228, 14%, 14%)" fillOpacity={0.95} stroke="#555" strokeWidth={0.5} />
                <text x={6} y={13} fill="#888" fontSize={9} fontFamily="monospace">GC ${hoverInfo.price.toFixed(0)}</text>
                <text x={6} y={27} fill={hoverInfo.pnl >= 0 ? '#4ade80' : '#f87171'} fontSize={11} fontFamily="monospace" fontWeight="bold">
                  ${hoverInfo.pnl >= 0 ? '+' : ''}${hoverInfo.pnl.toLocaleString()}
                </text>
              </g>
            </g>
          )}

          {/* X axis labels */}
          {xTicks.map(v => {
            const x = xScale(v);
            if (x < MARGIN.left + 10 || x > MARGIN.left + plotW - 10) return null;
            return (
              <text key={`xl${v}`} x={x} y={CHART_HEIGHT - 6} fill="#888" fontSize={9} textAnchor="middle" fontFamily="monospace">
                ${v.toFixed(0)}
              </text>
            );
          })}

          {/* Y axis labels */}
          {yTicks.map(v => {
            const y = yScale(v);
            if (y < MARGIN.top + 5 || y > MARGIN.top + plotH - 5) return null;
            return (
              <text key={`yl${v}`} x={MARGIN.left - 6} y={y + 3} fill="#888" fontSize={9} textAnchor="end" fontFamily="monospace">
                {v >= 1000 || v <= -1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)}
              </text>
            );
          })}

          {/* Axis lines */}
          <line x1={MARGIN.left} y1={MARGIN.top} x2={MARGIN.left} y2={MARGIN.top + plotH} stroke="#555" />
          <line x1={MARGIN.left} y1={MARGIN.top + plotH} x2={MARGIN.left + plotW} y2={MARGIN.top + plotH} stroke="#555" />
        </svg>
      </div>
    </div>
  );
}
