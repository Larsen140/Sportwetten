import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  BrainCircuit, CheckCircle2, LayoutDashboard, LogOut, Menu, Plus, Ticket, Trash2, Volume2, VolumeX, AlertCircle,
} from 'lucide-react';
import Background from './components/Background.jsx';
import Chat from './components/Chat.jsx';
import Dashboard from './components/Dashboard.jsx';
import Bets from './components/Bets.jsx';
import StakeModal from './components/StakeModal.jsx';
import Login from './components/Login.jsx';
import { api, betProfit, computeStats, euro, setUnauthorizedHandler } from './api.js';
import { sfx, isMuted, setMuted } from './sound.js';

const NAV = [
  ['chat', 'KI-Analyst', BrainCircuit],
  ['dashboard', 'Dashboard', LayoutDashboard],
  ['bets', 'Wettschein', Ticket],
];

function celebrate(x, y) {
  const origin = { x: x / window.innerWidth, y: y / window.innerHeight };
  const colors = ['#19f58c', '#22d3ee', '#ffc94d', '#ffffff'];
  confetti({ particleCount: 90, spread: 75, startVelocity: 42, origin, colors, scalar: 1.05 });
  setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 60, origin: { x: 0, y: 0.8 }, colors }), 180);
  setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.8 }, colors }), 300);
}

export default function App() {
  const [page, setPage] = useState('chat');
  const [status, setStatus] = useState({ demo: false });
  const [bets, setBets] = useState([]);
  const [convos, setConvos] = useState([]);
  const [chat, setChat] = useState({ key: 0, id: null, messages: [] });
  const [draft, setDraft] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [floats, setFloats] = useState([]);
  const [muted, setMutedState] = useState(isMuted());
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const [auth, setAuth] = useState('checking'); // checking | locked | ok

  const toast = useCallback((text, type = 'success') => {
    const id = Math.random();
    setToasts((t) => [...t, { id, text, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const loadAll = useCallback(async () => {
    try {
      const st = await api.status();
      setStatus(st);
      if (st.authRequired && !st.authed) { setAuth('locked'); return; }
      setAuth('ok');
      api.bets().then(setBets).catch(() => {});
      api.conversations().then(setConvos).catch(() => {});
    } catch {
      setAuth('ok');
      toast('Server nicht erreichbar', 'error');
    }
  }, [toast]);

  useEffect(() => {
    setUnauthorizedHandler(() => setAuth('locked'));
    loadAll();
  }, [loadAll]);

  async function logout() {
    await api.logout().catch(() => {});
    setBets([]);
    setConvos([]);
    setChat((c) => ({ key: c.key + 1, id: null, messages: [] }));
    setAuth('locked');
  }

  function go(p) {
    if (p !== page) sfx.nav();
    setPage(p);
    setMenu(false);
  }

  function newChat() {
    sfx.nav();
    setChat((c) => ({ key: c.key + 1, id: null, messages: [] }));
    setPage('chat');
    setMenu(false);
  }

  async function openChat(id) {
    if (busy) return;
    try {
      const c = await api.conversation(id);
      sfx.nav();
      setChat((prev) => ({ key: prev.key + 1, id: c.id, messages: c.ui }));
      setPage('chat');
      setMenu(false);
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function deleteChat(id, e) {
    e.stopPropagation();
    await api.deleteConversation(id).catch(() => {});
    setConvos((c) => c.filter((x) => x.id !== id));
    if (chat.id === id) newChat();
  }

  const onConversation = useCallback((id, title) => {
    setChat((c) => ({ ...c, id }));
    setConvos((list) => [{ id, title, updatedAt: Date.now() }, ...list.filter((x) => x.id !== id)]);
  }, []);

  async function saveBet(bet) {
    try {
      const saved = await api.addBet(bet);
      setBets((b) => [saved, ...b]);
      setDraft(null);
      sfx.place();
      toast(`Wette gespeichert · mögl. Auszahlung ${euro(saved.stake * saved.totalOdds)}`);
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function setBetStatus(bet, statusValue, e) {
    try {
      const updated = await api.setBetStatus(bet.id, statusValue);
      setBets((list) => list.map((b) => (b.id === bet.id ? updated : b)));
      if (statusValue === 'won') {
        sfx.win();
        const x = e?.clientX ?? window.innerWidth / 2;
        const y = e?.clientY ?? window.innerHeight / 2;
        celebrate(x, y);
        const id = Math.random();
        setFloats((f) => [...f, { id, x, y, text: `+${euro(betProfit(updated))}` }]);
        setTimeout(() => setFloats((f) => f.filter((v) => v.id !== id)), 1800);
      } else if (statusValue === 'lost') {
        sfx.lose();
      } else {
        sfx.click();
      }
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function deleteBet(bet) {
    await api.deleteBet(bet.id).catch(() => {});
    sfx.click();
    setBets((list) => list.filter((b) => b.id !== bet.id));
  }

  function toggleMute() {
    const v = !muted;
    setMuted(v);
    setMutedState(v);
    if (!v) sfx.click();
  }

  const stats = computeStats(bets);

  if (auth !== 'ok') {
    return (
      <>
        <Background />
        {auth === 'locked' && <Login onSuccess={loadAll} />}
      </>
    );
  }

  return (
    <>
      <Background intensity={busy ? 3 : 1} />
      <div className="app">
        <div className="mobile-top">
          <button className="icon-btn" onClick={() => setMenu(true)} aria-label="Menü"><Menu size={18} /></button>
          <div className={`orb ${busy ? 'thinking' : ''}`} style={{ '--s': '26px' }} />
          <div className="brand-name"><span className="gradient-text">LA</span> FOOTBALL</div>
        </div>

        <aside className={`sidebar ${menu ? 'open' : ''}`}>
          <div className="brand">
            <div className={`orb ${busy ? 'thinking' : ''}`} />
            <div>
              <div className="brand-name"><span className="gradient-text">LA</span> FOOTBALL</div>
              <div className="brand-sub">KI-Wettexperte</div>
            </div>
          </div>

          <button className="btn primary" onClick={newChat}><Plus size={17} /> Neue Analyse</button>

          <nav className="nav">
            {NAV.map(([key, label, Icon]) => (
              <button key={key} className={`nav-btn ${page === key ? 'active' : ''}`} onClick={() => go(key)} onMouseEnter={sfx.hover}>
                {page === key && <motion.span layoutId="nav-pill" className="nav-pill" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                <Icon size={18} /> {label}
                {key === 'bets' && stats.open > 0 && <span className="badge green">{stats.open}</span>}
              </button>
            ))}
          </nav>

          <div className="side-section">
            <div className="side-title">Verlauf</div>
            <div className="convo-list">
              {convos.length === 0 && <div className="card-sub" style={{ padding: '0 8px' }}>Noch keine Analysen.</div>}
              {convos.map((c) => (
                <button key={c.id} className={`convo ${chat.id === c.id && page === 'chat' ? 'active' : ''}`} onClick={() => openChat(c.id)}>
                  <span>{c.title}</span>
                  <i className="del" role="button" aria-label="Löschen" onClick={(e) => deleteChat(c.id, e)}><Trash2 size={13} /></i>
                </button>
              ))}
            </div>
          </div>

          <div className="side-foot">
            <div className="mini-stat">
              <div className="label">Bilanz</div>
              <div className={`value ${stats.profit >= 0 ? 'pos' : 'neg'}`}>{stats.profit >= 0 ? '+' : ''}{euro(stats.profit)}</div>
              <div className="card-sub">ROI {stats.roi >= 0 ? '+' : ''}{stats.roi.toFixed(1)} % · {stats.won}/{stats.settled} Treffer</div>
            </div>
            <div className="row">
              <button className="icon-btn" onClick={toggleMute} title={muted ? 'Sound an' : 'Sound aus'}>
                {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
              </button>
              {status.demo
                ? <span className="badge gold">Demo-Modus</span>
                : <span className="badge green">KI online</span>}
              {status.liveOdds && <span className="badge cyan">Live-Quoten</span>}
              {status.authRequired && (
                <button className="icon-btn" style={{ marginLeft: 'auto' }} onClick={logout} title="Abmelden"><LogOut size={16} /></button>
              )}
            </div>
          </div>
        </aside>
        {menu && <div className="modal-back" style={{ zIndex: 55 }} onClick={() => setMenu(false)} />}

        <main className="main">
          <AnimatePresence mode="wait">
            <motion.div key={page === 'chat' ? `chat-${chat.key}` : page}
              className={`page ${page === 'chat' ? 'page-chat' : ''}`}
              initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
              transition={{ duration: 0.3 }}>
              {page === 'chat' && (
                <Chat conversationId={chat.id} initialMessages={chat.messages} onConversation={onConversation}
                  onBet={setDraft} onBusy={setBusy} demo={status.demo} toast={toast} />
              )}
              {page === 'dashboard' && <Dashboard bets={bets} onStatus={setBetStatus} goChat={newChat} />}
              {page === 'bets' && <Bets bets={bets} onStatus={setBetStatus} onDelete={deleteBet} onNew={() => setDraft({})} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <AnimatePresence>
        {draft && <StakeModal draft={draft} onClose={() => setDraft(null)} onSave={saveBet} />}
      </AnimatePresence>

      <div className="toasts">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div key={t.id} className={`toast ${t.type}`}
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}>
              {t.type === 'error' ? <AlertCircle size={17} color="var(--danger)" /> : <CheckCircle2 size={17} color="var(--accent)" />}
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {floats.map((f) => (
        <motion.div key={f.id} className="float-win" style={{ left: f.x, top: f.y }}
          initial={{ opacity: 0, y: 0, x: '-50%', scale: 0.6 }}
          animate={{ opacity: [0, 1, 1, 0], y: -140, scale: [0.6, 1.3, 1, 1] }}
          transition={{ duration: 1.7, ease: 'easeOut' }}>
          {f.text}
        </motion.div>
      ))}
    </>
  );
}
