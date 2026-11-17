import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Lock } from 'lucide-react';
import { api } from '../api.js';
import { sfx } from '../sound.js';

export default function Login({ onSuccess }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError('');
    try {
      await api.login(password);
      sfx.card();
      onSuccess();
    } catch (err) {
      sfx.error();
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <motion.form className="panel login-box" onSubmit={submit}
        initial={{ opacity: 0, y: 30, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}>
        <div className="card-glow" />
        <motion.div className="orb" style={{ '--s': '72px' }} initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 140, damping: 12, delay: 0.1 }} />
        <h1><span className="gradient-text">LA</span> FOOTBALL</h1>
        <p>KI-Wettexperte · Bitte melde dich an.</p>
        <div className="field" style={{ width: '100%' }}>
          <label htmlFor="pw"><Lock size={12} /> Passwort</label>
          <input id="pw" type="password" className="input" autoComplete="current-password" autoFocus
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <motion.div className="err-box" style={{ width: '100%' }} initial={{ x: -8 }} animate={{ x: [8, -6, 4, 0] }}>{error}</motion.div>}
        <button className="btn primary" style={{ width: '100%' }} disabled={!password || busy}>
          {busy ? 'Prüfe …' : <>Anmelden <ArrowRight size={17} /></>}
        </button>
      </motion.form>
    </div>
  );
}
