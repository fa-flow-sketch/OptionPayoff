'use client';

import { useState, useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { type BarResult } from '@/lib/simulator';

const GREEKS = [
  { key: 'delta', name: 'Eff. Delta', color: '#60B5FF', width: 2 },
  { key: 'gamma', name: 'Gamma (×1000)', color: '#FF9149', width: 1.5 },
  { key: 'theta', name: 'Theta ($/day)', color: '#A19AD3', width: 1.5 },
] as const;

type GreekKey = typeof GREEKS[number]['key'];

export default function GreeksChart({ bars }: { bars: BarResult[] }) {
  const [visible, setVisible] = useState<Record<GreekKey, boolean>>({
    delta: true,
    gamma: true,
    theta: true,
  });

  const toggle = (key: GreekKey) => {
    setVisible(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const data = useMemo(() => {
    return (bars ?? []).filter((_: BarResult, i: number) => i % 3 === 0).map((b: BarResult) => ({
      time: b?.datetime?.toLocaleDateString?.('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' }) ?? '',
      delta: Number(b?.effectiveDelta?.toFixed?.(3) ?? 0),
      gamma: Number(((b?.netGamma ?? 0) * 1000)?.toFixed?.(3) ?? 0),
      theta: Number(b?.netTheta?.toFixed?.(2) ?? 0),
    }));
  }, [bars]);

  // Auto-scale Y domain based on visible series
  const yDomain = useMemo(() => {
    if (data.length === 0) return [-1, 1];
    let min = Infinity;
    let max = -Infinity;
    for (const d of data) {
      if (visible.delta) { min = Math.min(min, d.delta); max = Math.max(max, d.delta); }
      if (visible.gamma) { min = Math.min(min, d.gamma); max = Math.max(max, d.gamma); }
      if (visible.theta) { min = Math.min(min, d.theta); max = Math.max(max, d.theta); }
    }
    if (min === Infinity) return [-1, 1];
    const pad = Math.max(Math.abs(max - min) * 0.15, 0.01);
    return [min - pad, max + pad];
  }, [data, visible]);

  return (
    <div className="h-full flex flex-col">
      {/* Toggle checkboxes */}
      <div className="flex items-center gap-4 mb-2">
        {GREEKS.map(g => (
          <label key={g.key} className="flex items-center gap-1.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={visible[g.key]}
              onChange={() => toggle(g.key)}
              className="sr-only"
            />
            <span
              className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-all ${
                visible[g.key]
                  ? 'border-transparent'
                  : 'border-muted-foreground/40 bg-transparent'
              }`}
              style={visible[g.key] ? { backgroundColor: g.color, borderColor: g.color } : {}}
            >
              {visible[g.key] && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5L4.5 7.5L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <span className={`text-xs font-mono transition-colors ${
              visible[g.key] ? 'text-foreground' : 'text-muted-foreground/50 line-through'
            }`} style={visible[g.key] ? { color: g.color } : {}}>
              {g.name}
            </span>
          </label>
        ))}
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 20 }}>
            <XAxis
              dataKey="time"
              tickLine={false}
              tick={{ fontSize: 10, fill: 'hsl(228 10% 55%)' }}
              interval="preserveStartEnd"
            />
            <YAxis
              tickLine={false}
              tick={{ fontSize: 10, fill: 'hsl(228 10% 55%)' }}
              domain={yDomain}
            />
            <Tooltip
              contentStyle={{ backgroundColor: 'hsl(228 14% 13%)', border: '1px solid hsl(228 12% 20%)', borderRadius: '8px', fontSize: 11 }}
              labelStyle={{ color: '#F5A623' }}
            />
            {visible.delta && (
              <Line type="monotone" dataKey="delta" name="Eff. Delta" stroke="#60B5FF" strokeWidth={2} dot={false} />
            )}
            {visible.gamma && (
              <Line type="monotone" dataKey="gamma" name="Gamma (×1000)" stroke="#FF9149" strokeWidth={1.5} dot={false} />
            )}
            {visible.theta && (
              <Line type="monotone" dataKey="theta" name="Theta ($/day)" stroke="#A19AD3" strokeWidth={1.5} dot={false} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
