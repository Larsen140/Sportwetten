import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Download, Eye, EyeOff, KeyRound, Loader2, Trash2, Upload, X } from 'lucide-react';
import { sfx } from '../sound.js';

const local = () => import('../local/backend.js');

// Einstellungen für die GitHub-Pages-Variante: Schlüssel, Backup, Daten löschen
export default function Settings({ onClose, onChanged, toast, welcome }) {
  const [anthropic, setAnthropic] = useState('');
  const [odds, setOdds] = useState('');
  const [show, setShow] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    local().then(({ getKeys }) => {
      const k = getKeys();
      setAnthropic(k.anthropic);
      setOdds(k.odds);
    });
  }, []);

  async function save(e) {
    e.preventDefault();
    setError('');
    const { setKeys, testAnthropicKey } = await local();
    if (anthropic.trim()) {
      setChecking(true);
      const res = await testAnthropicKey(anthropic.trim());
      setChecking(false);
      if (!res.ok) { sfx.error(); setError(res.error); return; }
    }
    setKeys({ anthropic, odds });
    sfx.card();
    toast(anthropic.trim() ? 'Gespeichert – die KI ist bereit.' : 'Gespeichert – Demo-Modus aktiv.');
    onChanged();
    onClose();
  }

  async function doExport() {
    const { exportBackup } = await local();
    const data = await exportBackup();
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `la-football-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    sfx.click();
    toast('Sicherung erstellt');
  }

  async function doImport(file) {
    try {
      const { importBackup } = await local();
      const res = await importBackup(JSON.parse(await file.text()));
      sfx.card();
      toast(`${res.bets} Wetten und ${res.conversations} Chats wiederhergestellt`);
      onChanged();
    } catch (err) {
      sfx.error();
      toast(err.message || 'Datei konnte nicht gelesen werden', 'error');
    }
  }

  async function doDelete() {
    if (!window.confirm('Wirklich alle Wetten und Chats auf diesem Gerät löschen? Das lässt sich nicht rückgängig machen.')) return;
    const { deleteAllData } = await local();
    await deleteAllData();
    sfx.lose();
    toast('Alle Daten gelöscht');
    onChanged();
  }

  return (
    <motion.div className="modal-back" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
      <motion.form className="panel modal settings" onSubmit={save} onMouseDown={(e) => e.stopPropagation()}
        initial={{ scale: 0.9, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}>
        <div className="card-glow" />
        <button type="button" className="icon-btn sm modal-close" onClick={onClose} aria-label="Schließen"><X size={15} /></button>
        <h3>{welcome ? 'Willkommen bei LA Football' : 'Einstellungen'}</h3>
        <div className="card-sub">
          {welcome
            ? 'Trage deinen Anthropic-API-Schlüssel ein, damit der KI-Experte echte Analysen machen kann. Ohne Schlüssel kannst du die App im Demo-Modus ansehen.'
            : 'Deine Schlüssel und Daten bleiben nur auf diesem Gerät. Sie werden nie auf GitHub gespeichert.'}
        </div>

        <div className="field">
          <label htmlFor="ak"><KeyRound size={12} /> Anthropic-API-Schlüssel</label>
          <div className="input-wrap">
            <input id="ak" className="input" type={show ? 'text' : 'password'} autoComplete="off" spellCheck={false}
              placeholder="sk-ant-…" value={anthropic} onChange={(e) => setAnthropic(e.target.value)} />
            <button type="button" className="input-eye" onClick={() => setShow(!show)} aria-label="Anzeigen">
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <small className="card-sub">Zu finden auf console.anthropic.com unter „API Keys“.</small>
        </div>

        <div className="field">
          <label htmlFor="ok">Quoten-API-Schlüssel (optional)</label>
          <input id="ok" className="input" type={show ? 'text' : 'password'} autoComplete="off" spellCheck={false}
            placeholder="für Live-Quoten von the-odds-api.com" value={odds} onChange={(e) => setOdds(e.target.value)} />
        </div>

        {error && <div className="err-box" style={{ marginTop: 12 }}>{error}</div>}

        <div className="modal-actions">
          {welcome && <button type="button" className="btn ghost" onClick={onClose}>Erst Demo ansehen</button>}
          <button type="submit" className="btn primary" disabled={checking}>
            {checking ? <><Loader2 size={16} className="spin" /> Prüfe Schlüssel …</> : <><Check size={16} /> Speichern</>}
          </button>
        </div>

        {!welcome && (
          <div className="settings-data">
            <div className="sec-title" style={{ marginBottom: 8 }}>Daten auf diesem Gerät</div>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <button type="button" className="btn sm" onClick={doExport}><Download size={14} /> Sicherung speichern</button>
              <button type="button" className="btn sm" onClick={() => fileRef.current.click()}><Upload size={14} /> Sicherung laden</button>
              <button type="button" className="btn sm ghost danger" onClick={doDelete}><Trash2 size={14} /> Alles löschen</button>
            </div>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden
              onChange={(e) => { if (e.target.files[0]) doImport(e.target.files[0]); e.target.value = ''; }} />
            <small className="card-sub" style={{ display: 'block', marginTop: 8 }}>
              Tipp: Lege die App auf den Home-Bildschirm und speichere ab und zu eine Sicherung, damit nichts verloren geht.
            </small>
          </div>
        )}
      </motion.form>
    </motion.div>
  );
}
