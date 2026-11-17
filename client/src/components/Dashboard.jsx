import { motion } from 'framer-motion';
import { Coins, Crown, Percent, Target, Timer, Sparkles } from 'lucide-react';
import CountUp from './CountUp.jsx';
import ProfitChart from './ProfitChart.jsx';
import { BetRow } from './Bets.jsx';
import { computeStats, euro, fmt } from '../api.js';
import { sfx } from '../sound.js';

function Tile({ icon: Icon, label, value, sub, className = '', delay = 0, glow }) {
  return (
    <motion.div className={`panel tile ${className}`}
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.5 }}>
      {glow && <div className="spark" style={{ background: glow }} />}
      <div className="label"><Icon size={15} /> {label}</div>
      <div className="value">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </motion.div>
  );
}

export default function Dashboard({ bets, onStatus, goChat }) {
  const s = computeStats(bets);
  const positive = s.profit >= 0;
  const open = bets.filter((b) => b.status === 'open').slice(0, 5);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Dein <span className="gradient-text">Dashboard</span></h1>
          <p>Gewinne, Trefferquote und Rendite auf einen Blick.</p>
        </div>
        <button className="btn primary" onClick={() => { sfx.nav(); goChat(); }}><Sparkles size={17} /> Neue Analyse</button>
      </div>

      <div className="tiles">
        <Tile icon={Coins} label="Gewinn / Verlust" className={`tile-hero ${positive ? '' : 'tile-neg'}`}
          glow={positive ? 'var(--accent)' : 'var(--danger)'}
          value={<span className={positive ? 'pos' : 'neg'}><CountUp value={s.profit} format={(v) => `${v >= 0 ? '+' : ''}${euro(v)}`} /></span>}
          sub={`${euro(s.staked)} eingesetzt`} />
        <Tile icon={Percent} label="Rendite (ROI)" delay={0.06}
          value={<span className={s.roi >= 0 ? 'pos' : 'neg'}><CountUp value={s.roi} format={(v) => `${v >= 0 ? '+' : ''}${fmt(v, 1)} %`} /></span>}
          sub="Gewinn geteilt durch Einsatz" />
        <Tile icon={Target} label="Trefferquote" delay={0.12}
          value={<CountUp value={s.hitRate} format={(v) => `${fmt(v, 0)} %`} />}
          sub={`${s.won} von ${s.settled} gewonnen`} />
        <Tile icon={Timer} label="Offene Wetten" delay={0.18}
          value={<CountUp value={s.open} />}
          sub={`${euro(s.openStake)} im Spiel`} />
        <Tile icon={Crown} label="Größter Gewinn" delay={0.24} glow="var(--gold)"
          value={<span style={{ color: 'var(--gold)' }}><CountUp value={s.biggestWin} format={(v) => euro(v)} /></span>}
          sub={`Ø Quote ${fmt(s.avgOdds)}`} />
      </div>

      <div className="grid-2">
        <motion.div className="panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="panel-head"><h3>Gewinnkurve</h3><span className="badge">kumuliert</span></div>
          <div className="panel-body"><ProfitChart bets={bets} /></div>
        </motion.div>
        <motion.div className="panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}>
          <div className="panel-head"><h3>Offene Wetten</h3><span className="badge">{s.open}</span></div>
          <div className="panel-body bet-list">
            {open.length === 0
              ? <div className="empty">Keine offenen Wetten.</div>
              : open.map((b) => <BetRow key={b.id} bet={b} onStatus={onStatus} compact />)}
          </div>
        </motion.div>
      </div>
    </>
  );
}
