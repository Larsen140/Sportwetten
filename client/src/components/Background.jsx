import { useEffect, useRef } from 'react';

// Animierter Partikel-Hintergrund mit Verbindungslinien (Netzwerk-Look)
export default function Background({ intensity = 1 }) {
  const ref = useRef(null);
  const boost = useRef(intensity);
  boost.current = intensity;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w, h, dpr, raf;
    let particles = [];
    const mouse = { x: -9999, y: -9999 };

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.width = window.innerWidth * dpr;
      h = canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      const count = Math.min(90, Math.floor((window.innerWidth * window.innerHeight) / 18000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25 * dpr,
        vy: (Math.random() - 0.5) * 0.25 * dpr - 0.08 * dpr,
        r: (Math.random() * 1.4 + 0.4) * dpr,
        hue: Math.random() < 0.7 ? 152 : 188,
      }));
    }

    function frame() {
      ctx.clearRect(0, 0, w, h);
      const speed = boost.current;
      const link = 130 * dpr;
      for (const p of particles) {
        p.x += p.vx * speed;
        p.y += p.vy * speed;
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
        const dx = p.x - mouse.x, dy = p.y - mouse.y;
        const md = Math.hypot(dx, dy);
        if (md < 120 * dpr) { p.x += (dx / md) * 0.6 * dpr; p.y += (dy / md) * 0.6 * dpr; }
      }
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < link) {
            ctx.strokeStyle = `hsla(${a.hue}, 90%, 60%, ${(1 - d / link) * 0.12 * Math.min(speed, 2)})`;
            ctx.lineWidth = dpr * 0.6;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        ctx.fillStyle = `hsla(${a.hue}, 95%, 65%, 0.7)`;
        ctx.shadowColor = `hsla(${a.hue}, 95%, 60%, 0.9)`;
        ctx.shadowBlur = 8 * dpr;
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }
      if (!reduce) raf = requestAnimationFrame(frame);
    }

    const onMove = (e) => { mouse.x = e.clientX * dpr; mouse.y = e.clientY * dpr; };
    resize();
    frame();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  return (
    <>
      <div className="bg-glow" />
      <div className="bg-pitch" />
      <canvas ref={ref} className="bg-canvas" />
    </>
  );
}
