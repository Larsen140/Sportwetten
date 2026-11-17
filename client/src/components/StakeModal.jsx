import { useState } from 'react';
import { motion } from 'framer-motion';
import { Ticket } from 'lucide-react';
import { euro, fmt } from '../api.js';

// Dialog zum Platzieren einer Wette (aus einer KI-Karte oder manuell)
export default function StakeModal({ draft, onClose, onSave }) {
  const manual = !draft.legs?.length;
  const [title, setTitle] = useState(draft.title || '');
  const [odds, setOdds] = useState(draft.totalOdds ? String(draft.totalOdds) : '');
  const [stake, setStake] = useState('10');
  const o = parseFloat(String(odds).replace(',', '.'));
  const s = parseFloat(String(stake).replace(',', '.'));
  const valid = title.trim() && o > 1 && s > 0;

  function submit(e) {
    e.preventDefault();
    if (!valid) return;
    onSave({ title: title.trim(), legs: draft.legs || [], totalOdds: o, stake: s, source: manual ? 'manuell' : 'ki' });
  }

  return (
    <motion.div className="modal-back" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
      <motion.form className="panel modal" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}
        initial={{ scale: 0.9, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}>
        <div className="card-glow" />
        <h3>{manual ? 'Wette eintragen' : 'Auf Wettschein setzen'}</h3>
        <div className="card-sub">Die Wette wird in deinem Tracker gespeichert, nicht bei einem Buchmacher platziert.</div>

        <div className="field">
          <label htmlFor="t">Bezeichnung</label>
          <input id="t" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Bayern – Dortmund: Über 2,5" autoFocus={manual} />
        </div>
        {!manual && (
          <div className="bet-legs">
            {draft.legs.map((l, i) => <span key={i} className="leg-chip">{l.match}: <b>{l.pick}</b> @ {fmt(l.odds)}</span>)}
          </div>
        )}
        <div className="row" style={{ gap: 12 }}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="o">Quote</label>
            <input id="o" className="input" inputMode="decimal" value={odds} onChange={(e) => setOdds(e.target.value)} placeholder="1,85" />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="s">Einsatz (€)</label>
            <input id="s" className="input" inputMode="decimal" value={stake} onChange={(e) => setStake(e.target.value)} autoFocus={!manual} />
          </div>
        </div>
        <div className="quick-stakes">
          {[5, 10, 20, 50].map((v) => (
            <button type="button" key={v} className="chip" onClick={() => setStake(String(v))}>{v} €</button>
          ))}
        </div>
        <div className="payout">
          <span>Mögliche Auszahlung</span>
          <b>{valid ? euro(o * s) : '–'}</b>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Abbrechen</button>
          <button type="submit" className="btn primary" disabled={!valid}><Ticket size={16} /> Speichern</button>
        </div>
      </motion.form>
    </motion.div>
  );
}
