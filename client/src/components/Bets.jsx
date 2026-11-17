import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Plus, RotateCcw, ScanLine, Ticket, Trash2, X, Ban, Bot } from 'lucide-react';
import { betProfit, euro, fmt } from '../api.js';
import { sfx } from '../sound.js';

const FILTERS = [
  ['all', 'Alle'], ['open', 'Offen'], ['won', 'Gewonnen'], ['lost', 'Verloren'],
];
const STATUS = { open: ['Offen', ''], won: ['Gewonnen', 'green'], lost: ['Verloren', 'red'], void: ['Storniert', ''] };

export function BetRow({ bet, onStatus, onDelete, compact }) {
  const profit = betProfit(bet);
  const [label, color] = STATUS[bet.status];
  return (
    <motion.div layout className={`panel bet ${bet.status}`}
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -40, transition: { duration: 0.2 } }}>
      <div style={{ minWidth: 0 }}>
        <div className="bet-title">
          {bet.title}
          <span className={`badge ${color}`}>{label}</span>
          {bet.source === 'ki' && <span className="badge cyan"><Bot size={11} /> KI</span>}
          {bet.source === 'import' && <span className="badge cyan"><ScanLine size={11} /> Import</span>}
          {bet.bookmaker && <span className="badge">{bet.bookmaker}</span>}
        </div>
        {!compact && bet.legs?.length > 0 && (
          <div className="bet-legs">
            {bet.legs.map((l, i) => (
              <span key={i} className="leg-chip">{l.match}: <b>{l.pick}</b>{l.odds ? ` @ ${fmt(l.odds)}` : ''}</span>
            ))}
          </div>
        )}
        <div className="bet-meta">
          <span>Einsatz <b>{euro(bet.stake)}</b></span>
          <span>Quote <b>{fmt(bet.totalOdds)}</b></span>
          <span>Mögl. Auszahlung <b>{euro(bet.stake * bet.totalOdds)}</b></span>
          {!compact && <span>{new Date(bet.createdAt).toLocaleDateString('de-DE')}</span>}
        </div>
      </div>
      <div className="bet-actions">
        <div className={`bet-result ${profit > 0 ? 'pos' : profit < 0 ? 'neg' : ''}`}>
          {bet.status === 'won' || bet.status === 'lost' ? `${profit > 0 ? '+' : ''}${euro(profit)}` : bet.status === 'void' ? '±0 €' : 'läuft'}
        </div>
        {onStatus && (bet.status === 'open' ? (
          <>
            <button className="act win" title="Gewonnen" onClick={(e) => onStatus(bet, 'won', e)}><Check size={17} /></button>
            <button className="act lose" title="Verloren" onClick={(e) => onStatus(bet, 'lost', e)}><X size={17} /></button>
            {!compact && <button className="act neutral" title="Storniert" onClick={(e) => onStatus(bet, 'void', e)}><Ban size={15} /></button>}
          </>
        ) : (
          <button className="act neutral" title="Wieder öffnen" onClick={(e) => onStatus(bet, 'open', e)}><RotateCcw size={15} /></button>
        ))}
        {onDelete && !compact && (
          <button className="act lose" title="Löschen" onClick={() => onDelete(bet)}><Trash2 size={15} /></button>
        )}
      </div>
    </motion.div>
  );
}

export default function Bets({ bets, onStatus, onDelete, onNew }) {
  const [filter, setFilter] = useState('all');
  const list = filter === 'all' ? bets : bets.filter((b) => b.status === filter);
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Wettschein</h1>
          <p>Alle deine Wetten. Markiere sie nach dem Spiel als gewonnen oder verloren.</p>
        </div>
        <button className="btn primary" onClick={() => { sfx.click(); onNew(); }}><Plus size={17} /> Wette eintragen</button>
      </div>
      <div className="filters" style={{ marginBottom: 18 }}>
        {FILTERS.map(([k, l]) => (
          <button key={k} className={`chip ${filter === k ? 'active' : ''}`} onClick={() => { sfx.click(); setFilter(k); }}>
            {l} <span style={{ opacity: 0.6 }}>{k === 'all' ? bets.length : bets.filter((b) => b.status === k).length}</span>
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <div className="panel empty">
          <Ticket size={36} />
          <div>Hier ist noch nichts. Lass dir im KI-Analysten eine Kombi bauen und setze sie auf den Wettschein.</div>
        </div>
      ) : (
        <div className="bet-list">
          <AnimatePresence initial={false}>
            {list.map((b) => <BetRow key={b.id} bet={b} onStatus={onStatus} onDelete={onDelete} />)}
          </AnimatePresence>
        </div>
      )}
    </>
  );
}
