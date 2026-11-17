import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { betProfit, euro } from '../api.js';

// Kumulierter Gewinn/Verlust über alle abgerechneten Wetten
export default function ProfitChart({ bets }) {
  const ref = useRef(null);
  const wrapRef = useRef(null);
  const [hover, setHover] = useState(null);
  const [W, setW] = useState(800);


  const points = useMemo(() => {
    const settled = bets
      .filter((b) => b.status === 'won' || b.status === 'lost')
      .sort((a, b) => (a.settledAt || a.createdAt) - (b.settledAt || b.createdAt));
    let sum = 0;
    return [{ v: 0, label: 'Start' }, ...settled.map((b) => {
      sum += betProfit(b);
      return { v: sum, label: b.title, delta: betProfit(b), date: b.settledAt || b.createdAt };
    })];
  }, [bets]);

  const hasChart = points.length >= 2;
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasChart]);

  if (!hasChart) {
    return <div className="empty">Noch keine abgerechneten Wetten. Sobald du Wetten als gewonnen oder verloren markierst, erscheint hier deine Gewinnkurve.</div>;
  }

  const H = 280, P = { l: 56, r: 16, t: 16, b: 28 };
  const vals = points.map((p) => p.v);
  let min = Math.min(0, ...vals), max = Math.max(0, ...vals);
  if (max === min) { max += 1; min -= 1; }
  // "Schöne" Achsenwerte (1, 2, 5 × 10^n)
  const raw = (max - min) / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 5, 10].map((k) => k * mag).find((k) => k >= raw);
  min = Math.floor(min / step) * step;
  max = Math.ceil(max / step) * step;
  const x = (i) => P.l + (i / (points.length - 1)) * (W - P.l - P.r);
  const y = (v) => P.t + (1 - (v - min) / (max - min)) * (H - P.t - P.b);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const final = vals.at(-1);
  const color = final >= 0 ? '#19f58c' : '#ff4d6d';
  const ticks = [];
  for (let t = min; t <= max + step / 2; t += step) ticks.push(t);

  function onMove(e) {
    const rect = ref.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - P.l) / (W - P.l - P.r)) * (points.length - 1));
    const idx = Math.max(0, Math.min(points.length - 1, i));
    setHover({ i: idx, left: (x(idx) / W) * rect.width, top: (y(points[idx].v) / H) * rect.height });
  }

  const hp = hover && points[hover.i];

  return (
    <div className="chart-wrap" ref={wrapRef} onMouseLeave={() => setHover(null)}>
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} onMouseMove={onMove}
        role="img" aria-label={`Gewinnkurve, aktueller Stand ${euro(final)}`}>
        <defs>
          <linearGradient id="pf" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,.05)" vectorEffect="non-scaling-stroke" />
            <text x={P.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#7b889e" fontFamily="JetBrains Mono">
              {Math.round(t).toLocaleString('de-DE')} €
            </text>
          </g>
        ))}
        <line x1={P.l} x2={W - P.r} y1={y(0)} y2={y(0)} stroke="rgba(255,255,255,.25)" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
        <motion.path d={area} fill="url(#pf)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.8 }} />
        <motion.path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
          vectorEffect="non-scaling-stroke" style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, ease: 'easeInOut' }} />
        {hover && (
          <line x1={x(hover.i)} x2={x(hover.i)} y1={P.t} y2={H - P.b} stroke="rgba(255,255,255,.25)" vectorEffect="non-scaling-stroke" />
        )}
      </svg>
      {hover && (
        <>
          <div style={{
            position: 'absolute', left: hover.left, top: hover.top, width: 10, height: 10, borderRadius: '50%',
            background: color, transform: 'translate(-50%,-50%)', boxShadow: `0 0 0 3px #04060c, 0 0 12px ${color}`, pointerEvents: 'none',
          }} />
          <div className="chart-tip" style={{ left: hover.left, top: hover.top }}>
            <div style={{ color: 'var(--muted)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>{hp.label}</div>
            {hp.delta !== undefined && (
              <div>Wette: <b className={hp.delta >= 0 ? 'pos' : 'neg'}>{hp.delta >= 0 ? '+' : ''}{euro(hp.delta)}</b></div>
            )}
            <div>Gesamt: <b className={hp.v >= 0 ? 'pos' : 'neg'}>{euro(hp.v)}</b></div>
          </div>
        </>
      )}
    </div>
  );
}
