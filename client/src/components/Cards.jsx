import { motion } from 'framer-motion';
import { Activity, AlertTriangle, CheckCircle2, Crosshair, Layers, Sparkles, Ticket, TrendingUp } from 'lucide-react';
import CountUp from './CountUp.jsx';
import { fmt } from '../api.js';
import { sfx } from '../sound.js';

const n = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);

export function Ring({ value, size = 64, stroke = 6, color = 'var(--accent)' }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, n(value)));
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct / 100) }}
          transition={{ duration: 1.2, ease: [0.2, 0.8, 0.2, 1], delay: 0.3 }}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <span><CountUp value={pct} format={(v) => `${v.toFixed(0)}%`} /></span>
    </div>
  );
}

const cardMotion = {
  initial: { opacity: 0, y: 24, scale: 0.97, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
  transition: { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] },
};

const stagger = (i) => ({
  initial: { opacity: 0, x: -14 },
  animate: { opacity: 1, x: 0 },
  transition: { delay: 0.25 + i * 0.09, duration: 0.4 },
});

export function AnalysisCard({ data, onBet }) {
  const p = data.probabilities || {};
  const total = n(p.home) + n(p.draw) + n(p.away) || 1;
  const [home, away] = String(data.match || '').split(/\s[–-]\s|\svs\.?\s/i);
  const markets = [...(data.markets || [])].sort((a, b) => n(b.value_percent) - n(a.value_percent));
  const conf = Math.max(0, Math.min(10, Math.round(n(data.confidence))));

  return (
    <motion.div className="panel card" {...cardMotion}>
      <div className="card-glow" />
      <div className="card-top">
        <div>
          <div className="card-kicker"><Crosshair size={13} /> Spielanalyse · {data.competition}</div>
          <div className="card-title">{data.match}</div>
          <div className="card-sub">{data.kickoff}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="sec-title" style={{ marginBottom: 6 }}>Konfidenz</div>
          <div className="conf">
            {Array.from({ length: 10 }, (_, i) => (
              <motion.i key={i} className={i < conf ? 'on' : ''}
                initial={{ opacity: 0, scaleY: 0 }} animate={{ opacity: 1, scaleY: 1 }}
                transition={{ delay: 0.4 + i * 0.05 }} />
            ))}
          </div>
          <div className="card-sub" style={{ marginTop: 4 }}>{conf}/10</div>
        </div>
      </div>

      <div className="card-sec">
        <div className="sec-title">Wahrscheinlichkeiten 1 · X · 2</div>
        <div className="prob3">
          {[['h', p.home], ['d', p.draw], ['a', p.away]].map(([k, v], i) => (
            <motion.div key={k} className={k}
              initial={{ flexBasis: '0%' }} animate={{ flexBasis: `${(n(v) / total) * 100}%` }}
              transition={{ duration: 1, delay: 0.2 + i * 0.12, ease: [0.2, 0.8, 0.2, 1] }}>
              {n(v) >= 8 && `${fmt(v, 0)}%`}
            </motion.div>
          ))}
        </div>
        <div className="prob3-labels">
          <span>{home || 'Heim'}</span><span>Unentschieden</span><span>{away || 'Auswärts'}</span>
        </div>
        {data.expected_goals && (
          <div className="xg">
            <span>Erwartete Tore (xG): <b>{fmt(data.expected_goals.home, 1)}</b> : <b>{fmt(data.expected_goals.away, 1)}</b></span>
          </div>
        )}
      </div>

      {markets.length > 0 && (
        <div className="card-sec">
          <div className="sec-title">Märkte & Value</div>
          <div className="table-scroll">
            <table className="markets">
              <thead>
                <tr><th>Markt</th><th>Tipp</th><th className="num">Wahrsch.</th><th className="num">Faire Q.</th><th className="num">Buchm.</th><th className="num">Value</th><th /></tr>
              </thead>
              <tbody>
                {markets.map((m, i) => {
                  const v = n(m.value_percent);
                  return (
                    <motion.tr key={i} className={i === 0 && v > 0 ? 'top' : ''} {...stagger(i)}>
                      <td>{m.market}</td>
                      <td><b>{m.pick}</b></td>
                      <td className="num">{fmt(m.probability, 0)}%</td>
                      <td className="num">{fmt(m.fair_odds)}</td>
                      <td className="num">{n(m.bookmaker_odds) > 1 ? fmt(m.bookmaker_odds) : '–'}</td>
                      <td className="num">
                        <span className={`badge ${v > 0 ? 'green' : 'red'}`}>{v > 0 ? '+' : ''}{fmt(v, 1)}%</span>
                      </td>
                      <td>
                        {n(m.bookmaker_odds) > 1 && (
                          <button className="btn ghost sm" title="Auf Wettschein"
                            onClick={() => { sfx.click(); onBet({ title: `${data.match}: ${m.pick}`, legs: [{ match: data.match, market: m.market, pick: m.pick, odds: m.bookmaker_odds }], totalOdds: m.bookmaker_odds }); }}>
                            <Ticket size={15} />
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card-sec factors">
        <div>
          <div className="sec-title">Gründe</div>
          <ul>
            {(data.key_factors || []).map((f, i) => (
              <motion.li key={i} {...stagger(i)}><CheckCircle2 size={15} color="var(--accent)" />{f}</motion.li>
            ))}
          </ul>
        </div>
        <div>
          <div className="sec-title">Risiken</div>
          <ul>
            {(data.risks || []).map((f, i) => (
              <motion.li key={i} {...stagger(i + 2)}><AlertTriangle size={15} color="var(--gold)" />{f}</motion.li>
            ))}
          </ul>
        </div>
      </div>

      {data.verdict && (
        <div className="verdict"><Sparkles size={18} color="var(--accent)" />{data.verdict}</div>
      )}
    </motion.div>
  );
}

const RISK = { niedrig: 'green', mittel: 'gold', hoch: 'red' };

export function KombiCard({ data, onBet }) {
  const legs = data.legs || [];
  const ev = n(data.expected_value_percent);
  return (
    <motion.div className="panel card" {...cardMotion}>
      <div className="card-glow" />
      <div className="card-top">
        <div>
          <div className="card-kicker"><Layers size={13} /> {legs.length}er-Kombi</div>
          <div className="card-title">{data.title}</div>
        </div>
        <span className={`badge ${RISK[data.risk_level] || 'gold'}`}>Risiko: {data.risk_level}</span>
      </div>

      <div className="legs">
        {legs.map((l, i) => (
          <motion.div className="leg" key={i} {...stagger(i)}>
            <div className="leg-n">{i + 1}</div>
            <div style={{ minWidth: 0 }}>
              <div className="leg-match">{l.match}</div>
              <div className="card-sub">{l.kickoff} · {l.market}</div>
              <div className="leg-pick">{l.pick}</div>
              <div className="leg-reason">{l.reason}</div>
              <div className="pbar">
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, n(l.probability))}%` }}
                  transition={{ duration: 1, delay: 0.4 + i * 0.1 }} />
              </div>
            </div>
            <div className="leg-odds">
              <div className="o">{fmt(l.odds)}</div>
              <div className="p">{fmt(l.probability, 0)}% Wahrsch.</div>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="ticket-notch" />

      <div className="ticket-foot">
        <div className="total-odds">
          <div className="label">Gesamtquote</div>
          <div className="big"><CountUp value={n(data.total_odds)} format={(v) => fmt(v)} duration={1400} /></div>
        </div>
        <div className="foot-stats">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Ring value={data.combined_probability} size={56} stroke={5} />
            <span>Treffer-<br />wahrsch.</span>
          </div>
          <div><TrendingUp size={13} /> Erwartungswert<b className={ev >= 0 ? 'pos' : 'neg'}>{ev >= 0 ? '+' : ''}{fmt(ev, 1)}%</b></div>
          <div><Activity size={13} /> Einsatz-Empfehlung<b>{fmt(data.stake_suggestion_percent, 1)}% Bankroll</b></div>
        </div>
        <button className="btn primary" onClick={() => {
          sfx.click();
          onBet({
            title: data.title,
            legs: legs.map(({ match, market, pick, odds }) => ({ match, market, pick, odds })),
            totalOdds: data.total_odds,
          });
        }}>
          <Ticket size={17} /> Auf Wettschein
        </button>
      </div>
      {data.summary && <div className="card-sec card-sub" style={{ borderTop: '1px solid var(--border)' }}>{data.summary}</div>}
    </motion.div>
  );
}
