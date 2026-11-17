import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ArrowUp, Brain, ChevronDown, FileSearch, Globe, ImagePlus, Layers, MessageSquare,
  LineChart, NotebookPen, Wallet, ScanLine, Search, ShieldCheck, Square, Target, X, Zap,
} from 'lucide-react';
import { streamChat, downscaleImage } from '../api.js';
import { sfx } from '../sound.js';
import { AnalysisCard, KombiCard, SlipCard } from './Cards.jsx';

const SUGGESTIONS = [
  { icon: Layers, title: 'Value-Kombi bauen', text: 'Bau mir eine 3er-Kombi für die Bundesliga an diesem Wochenende – nur Tipps mit Value.' },
  { icon: Target, title: 'Topspiel analysieren', text: 'Analysiere das wichtigste Bundesliga-Spiel an diesem Wochenende mit allen Märkten.' },
  { icon: ShieldCheck, title: 'Sichere Kombi ~2.0', text: 'Bau mir eine Kombi mit Gesamtquote um 2,0 und möglichst hoher Trefferwahrscheinlichkeit.' },
  { icon: Zap, title: 'Champions League', text: 'Welche Champions-League-Spiele diese Woche haben die besten Value-Wetten? Zeig mir die Top 3.' },
  { icon: Wallet, title: 'Bankroll-Strategie', text: 'Erstelle mir eine Bankroll-Strategie für 500 € Startkapital mit klaren Einsatzregeln.' },
  { icon: ScanLine, title: 'bet365-Schein prüfen', text: 'upload', hint: 'Lade einen Screenshot deines bet365-Wettscheins hoch. Die KI liest ihn aus und bewertet ihn.' },
];

function Markdown({ text, live }) {
  return (
    <div className={`md ${live ? 'cursor' : ''}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}
        components={{ a: (p) => <a {...p} target="_blank" rel="noreferrer" /> }}>
        {text}
      </ReactMarkdown>
    </div>
  );
}

function Thinking({ text, live }) {
  const [open, setOpen] = useState(false);
  if (!text && !live) return null;
  return (
    <div className="thinking-box">
      <button className={`thinking-head ${live ? 'live' : ''}`} onClick={() => setOpen(!open)}>
        <Brain size={15} color="var(--violet)" />
        <span className="label">{live ? 'Die KI analysiert …' : 'Gedankengang'}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} style={{ marginLeft: 'auto', display: 'flex' }}>
          <ChevronDown size={15} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} style={{ overflow: 'hidden' }}>
            <div className="thinking-text">{text || '…'}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function host(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

function ToolGroup({ items, live }) {
  return (
    <div>
      <div className="tools-row">
        {items.map((it, i) => (
          <motion.div key={i} className="tool-chip" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
            {live && i === items.length - 1 ? <span className="ping" /> : it.type === 'search' ? <Search size={13} /> : it.type === 'odds' ? <LineChart size={13} /> : <FileSearch size={13} />}
            <span>{it.type === 'search' ? it.query : it.type === 'odds' ? `Live-Quoten${it.label ? ` · ${it.label}` : ''}` : host(it.url)}</span>
          </motion.div>
        ))}
      </div>
      {items.some((it) => it.results?.length) && (
        <div className="sources">
          {items.flatMap((it) => it.results || []).slice(0, 10).map((r, i) => (
            <a key={i} className="source" href={r.url} target="_blank" rel="noreferrer" title={r.title}>
              <Globe size={10} /> {host(r.url)}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function AssistantMessage({ msg, live, onBet }) {
  // Aufeinanderfolgende Such-/Abruf-Teile zu Gruppen zusammenfassen
  const groups = [];
  for (const part of msg.parts) {
    const isTool = part.type === 'search' || part.type === 'fetch' || part.type === 'odds';
    const last = groups.at(-1);
    if (isTool && last?.type === 'tools') last.items.push(part);
    else groups.push(isTool ? { type: 'tools', items: [part] } : part);
  }
  const lastIdx = groups.length - 1;

  return (
    <div className="msg-ai">
      <div className={`orb ${live ? 'thinking' : ''}`} />
      <div className="msg-ai-body">
        <Thinking text={msg.thinking} live={live && groups.length === 0} />
        {groups.map((g, i) => {
          if (g.type === 'tools') return <ToolGroup key={i} items={g.items} live={live && i === lastIdx} />;
          if (g.type === 'text') return <Markdown key={i} text={g.text} live={live && i === lastIdx} />;
          if (g.type === 'error') return <div key={i} className="err-box">{g.text}</div>;
          if (g.type === 'loading') return (
            <div key={i} className="skeleton">{{ kombi: 'Wettschein wird erstellt …', slip: 'Wettschein wird ausgelesen …' }[g.kind] || 'Analyse wird erstellt …'}</div>
          );
          if (g.type === 'card') {
            if (g.kind === 'kombi') return <KombiCard key={i} data={g.data} onBet={onBet} />;
            if (g.kind === 'slip') return <SlipCard key={i} data={g.data} onBet={onBet} />;
            return <AnalysisCard key={i} data={g.data} onBet={onBet} />;
          }
          return null;
        })}
      </div>
    </div>
  );
}

function UserMessage({ msg }) {
  return (
    <motion.div className="msg-user" initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}>
      {msg.mode === 'review' && <div className="mode"><span className="badge cyan"><NotebookPen size={11} /> Meine Analyse</span></div>}
      {msg.images?.length > 0 && <div className="imgs">{msg.images.map((src, i) => <img key={i} src={src} alt="" />)}</div>}
      {msg.text && <div className="bubble">{msg.text}</div>}
    </motion.div>
  );
}

export default function Chat({ conversationId, initialMessages, onConversation, onBet, onBusy, demo, toast, onOpenSettings }) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [images, setImages] = useState([]);
  const [mode, setMode] = useState('chat');
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const scrollRef = useRef(null);
  const taRef = useRef(null);
  const fileRef = useRef(null);
  const abortRef = useRef(null);
  const stick = useRef(true);
  const convoRef = useRef(conversationId);

  useEffect(() => { onBusy?.(busy); }, [busy, onBusy]);
  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && stick.current && messages.length) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 220)}px`;
  }, [input]);

  async function addFiles(files) {
    const list = [...files].filter((f) => f.type.startsWith('image/')).slice(0, 6 - images.length);
    try {
      const out = await Promise.all(list.map((f) => downscaleImage(f)));
      if (out.length) { sfx.click(); setImages((prev) => [...prev, ...out]); }
    } catch {
      toast('Bild konnte nicht geladen werden', 'error');
    }
  }

  function updateAssistant(fn) {
    setMessages((prev) => {
      const copy = [...prev];
      const last = { ...copy.at(-1), parts: [...copy.at(-1).parts] };
      fn(last);
      copy[copy.length - 1] = last;
      return copy;
    });
  }

  async function send(textArg) {
    const text = (textArg ?? input).trim();
    if ((!text && images.length === 0) || busy) return;
    sfx.send();
    stick.current = true;
    const imgs = images;
    const userMsg = { role: 'user', text, mode, images: imgs.map((i) => i.preview) };
    setMessages((prev) => [...prev, userMsg, { role: 'assistant', parts: [], thinking: '' }]);
    setInput('');
    setImages([]);
    setBusy(true);

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await streamChat(
        { conversationId: convoRef.current, text, mode, images: imgs.map(({ mediaType, data }) => ({ mediaType, data })) },
        (ev) => {
          switch (ev.type) {
            case 'conversation':
              convoRef.current = ev.id;
              onConversation(ev.id, ev.title);
              break;
            case 'thinking':
              updateAssistant((m) => { m.thinking += ev.text; });
              break;
            case 'text':
              updateAssistant((m) => {
                const last = m.parts.at(-1);
                if (last?.type === 'text') m.parts[m.parts.length - 1] = { ...last, text: last.text + ev.text };
                else m.parts.push({ type: 'text', text: ev.text });
              });
              break;
            case 'search':
            case 'fetch':
              sfx.search();
              updateAssistant((m) => { m.parts.push(ev.type === 'search' ? { type: 'search', query: ev.query } : { type: 'fetch', url: ev.url }); });
              break;
            case 'odds':
              sfx.search();
              updateAssistant((m) => { m.parts.push({ type: 'odds' }); });
              break;
            case 'odds_done':
              updateAssistant((m) => {
                for (let i = m.parts.length - 1; i >= 0; i--) {
                  if (m.parts[i].type === 'odds') { m.parts[i] = { ...m.parts[i], label: ev.label }; break; }
                }
              });
              break;
            case 'sources':
              updateAssistant((m) => {
                for (let i = m.parts.length - 1; i >= 0; i--) {
                  if (m.parts[i].type === 'search') { m.parts[i] = { ...m.parts[i], results: ev.results }; break; }
                }
              });
              break;
            case 'card_loading':
              updateAssistant((m) => { m.parts.push({ type: 'loading', kind: ev.kind }); });
              break;
            case 'card':
              sfx.card();
              updateAssistant((m) => {
                const idx = m.parts.findIndex((p) => p.type === 'loading');
                const card = { type: 'card', kind: ev.kind, data: ev.data };
                if (idx >= 0) m.parts[idx] = card; else m.parts.push(card);
              });
              break;
            case 'error':
              sfx.error();
              updateAssistant((m) => { m.parts = m.parts.filter((p) => p.type !== 'loading'); m.parts.push({ type: 'error', text: ev.message }); });
              break;
            case 'done':
              updateAssistant((m) => { m.parts = m.parts.filter((p) => p.type !== 'loading'); });
              sfx.done();
              break;
          }
        },
        controller.signal,
      );
    } catch (err) {
      if (err.name !== 'AbortError') {
        sfx.error();
        updateAssistant((m) => { m.parts.push({ type: 'error', text: err.message }); });
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  const empty = messages.length === 0;

  return (
    <>
      <div className="chat-scroll" ref={scrollRef}
        onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}>
        <div className="chat-inner" style={empty ? { minHeight: '100%' } : undefined}>
          {empty ? (
            <div className="hero">
              <motion.div className="orb" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 120, damping: 12 }} />
              <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                Welches Spiel <span className="gradient-text">knacken</span> wir heute?
              </motion.h1>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                Der KI-Experte recherchiert live Form, xG, Ausfälle und Quoten, rechnet Wahrscheinlichkeiten aus und sucht Value.
                Du kannst auch deine eigene Analyse oder einen Screenshot vom Wettschein schicken.
              </motion.p>
              {demo && (
                onOpenSettings ? (
                  <button className="demo-banner" onClick={onOpenSettings}>
                    <Zap size={15} /> Demo-Modus: Tippe hier und trage deinen API-Schlüssel ein, um echte Analysen zu bekommen.
                  </button>
                ) : (
                  <div className="demo-banner">
                    <Zap size={15} /> Demo-Modus: Trage <code>ANTHROPIC_API_KEY</code> in die <code>.env</code> ein, um echte Analysen zu bekommen.
                  </div>
                )
              )}
              <div className="suggestions">
                {SUGGESTIONS.map((s, i) => (
                  <motion.button key={i} className="suggestion" onMouseEnter={sfx.hover}
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.08 }}
                    onClick={() => { if (s.text === 'upload') { setInput('Lies meinen Wettschein aus und bewerte ihn.'); fileRef.current.click(); } else send(s.text); }}>
                    <div className="s-icon"><s.icon size={18} /></div>
                    <b>{s.title}</b>
                    <small>{s.hint || s.text}</small>
                  </motion.button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) =>
              m.role === 'user'
                ? <UserMessage key={i} msg={m} />
                : <AssistantMessage key={i} msg={m} live={busy && i === messages.length - 1} onBet={onBet} />,
            )
          )}
        </div>
      </div>

      <div className="composer-wrap">
        <div className={`composer ${drag ? 'drag' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}>
          {images.length > 0 && (
            <div className="attach-row">
              {images.map((img, i) => (
                <motion.div className="attach" key={i} initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  <img src={img.preview} alt="" />
                  <button onClick={() => setImages(images.filter((_, j) => j !== i))} aria-label="Bild entfernen"><X size={12} /></button>
                </motion.div>
              ))}
            </div>
          )}
          <textarea
            ref={taRef}
            rows={1}
            value={input}
            placeholder={mode === 'review'
              ? 'Füge deine Analyse ein – die KI prüft sie und sagt dir, was fehlt …'
              : 'Frag den KI-Experten: Spiel analysieren, Kombi bauen, Quoten prüfen …'}
            onChange={(e) => setInput(e.target.value)}
            onPaste={(e) => { if (e.clipboardData.files.length) addFiles(e.clipboardData.files); }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          />
          <div className="composer-bar">
            <div className="mode-toggle">
              {[['chat', MessageSquare, 'Chat'], ['review', NotebookPen, 'Meine Analyse prüfen']].map(([key, Icon, label]) => (
                <button key={key} className={mode === key ? 'on' : ''} title={label} onClick={() => { sfx.click(); setMode(key); }}>
                  {mode === key && <motion.span layoutId="mode-pill" className="mode-pill" />}
                  <Icon size={13} /><span className="lbl-long">{label}</span>
                </button>
              ))}
            </div>
            <button className="icon-btn" title="Bild / Screenshot anhängen" onClick={() => fileRef.current.click()}>
              <ImagePlus size={17} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
            <div className="spacer" />
            {busy ? (
              <button className="btn send-btn" title="Stoppen" onClick={() => abortRef.current?.abort()}><Square size={15} /></button>
            ) : (
              <button className="btn primary send-btn" title="Senden" disabled={!input.trim() && !images.length} onClick={() => send()}>
                <ArrowUp size={19} />
              </button>
            )}
          </div>
        </div>
        <div className="hint">LA Football liefert Wahrscheinlichkeiten, keine Garantien. Wette nur mit Geld, dessen Verlust du verkraften kannst. 18+</div>
      </div>
    </>
  );
}
