async function json(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Fehler ${res.status}`);
  return data;
}

export const api = {
  status: () => fetch('/api/status').then(json),
  conversations: () => fetch('/api/conversations').then(json),
  conversation: (id) => fetch(`/api/conversations/${id}`).then(json),
  deleteConversation: (id) => fetch(`/api/conversations/${id}`, { method: 'DELETE' }).then(json),
  bets: () => fetch('/api/bets').then(json),
  addBet: (bet) => fetch('/api/bets', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bet),
  }).then(json),
  setBetStatus: (id, status) => fetch(`/api/bets/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
  }).then(json),
  deleteBet: (id) => fetch(`/api/bets/${id}`, { method: 'DELETE' }).then(json),
};

// Liest die Server-Sent Events des Chat-Endpunkts und ruft onEvent für jedes Event auf.
export async function streamChat(body, onEvent, signal) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Fehler ${res.status}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n\n')) >= 0) {
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const line = chunk.split('\n').find((l) => l.startsWith('data: '));
      if (line) onEvent(JSON.parse(line.slice(6)));
    }
  }
}

export const euro = (v) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v || 0);
export const fmt = (v, d = 2) =>
  new Intl.NumberFormat('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v || 0);

export function betProfit(b) {
  if (b.status === 'won') return b.stake * b.totalOdds - b.stake;
  if (b.status === 'lost') return -b.stake;
  return 0;
}

export function computeStats(bets) {
  const settled = bets.filter((b) => b.status === 'won' || b.status === 'lost');
  const won = settled.filter((b) => b.status === 'won');
  const staked = settled.reduce((s, b) => s + b.stake, 0);
  const profit = settled.reduce((s, b) => s + betProfit(b), 0);
  return {
    total: bets.length,
    open: bets.filter((b) => b.status === 'open').length,
    openStake: bets.filter((b) => b.status === 'open').reduce((s, b) => s + b.stake, 0),
    settled: settled.length,
    won: won.length,
    profit,
    staked,
    roi: staked ? (profit / staked) * 100 : 0,
    hitRate: settled.length ? (won.length / settled.length) * 100 : 0,
    avgOdds: bets.length ? bets.reduce((s, b) => s + b.totalOdds, 0) / bets.length : 0,
    biggestWin: won.reduce((m, b) => Math.max(m, betProfit(b)), 0),
  };
}

// Bilder vor dem Hochladen verkleinern (spart Tokens und Speicher)
export function downscaleImage(file, max = 1568) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      const url = canvas.toDataURL('image/jpeg', 0.85);
      URL.revokeObjectURL(img.src);
      resolve({ mediaType: 'image/jpeg', data: url.split(',')[1], preview: url });
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
