import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { api } from '../../lib/api';
import Icon from '../ui/Icon';

const OFF_KEY = 'mindedu_fx_off';
const ICON = { rain: 'rain', snow: 'snow', wind: 'wind', none: 'sun' };

/* ---------- Бөөмсийн загвар ---------- */
const rnd = (a, b) => a + Math.random() * (b - a);

function makeParticle(kind, w, h, initial) {
  if (kind === 'rain') {
    return { x: rnd(-w * 0.2, w), y: initial ? rnd(-h, h) : rnd(-h * 0.3, -10), len: rnd(10, 22), v: rnd(13, 21), a: rnd(0.25, 0.55) };
  }
  if (kind === 'snow') {
    return { x: rnd(0, w), y: initial ? rnd(-h, h) : rnd(-40, -5), r: rnd(1.2, 3.6), v: rnd(0.5, 1.5), drift: rnd(0, Math.PI * 2), sway: rnd(0.3, 1.1) };
  }
  // wind: урсах зураас эсвэл навч
  const leaf = Math.random() < 0.28;
  return leaf
    ? { leaf: true, x: initial ? rnd(-w, w) : rnd(-80, -10), y: rnd(0, h), s: rnd(5, 9), v: rnd(4, 8), rot: rnd(0, Math.PI * 2), spin: rnd(-0.12, 0.12), wob: rnd(0, 6), color: ['#F6C530', '#E9A800', '#D9822B', '#8DBF4A'][Math.floor(Math.random() * 4)] }
    : { x: initial ? rnd(-w, w) : rnd(-300, -50), y: rnd(0, h), len: rnd(60, 180), v: rnd(10, 18), a: rnd(0.12, 0.3), curve: rnd(-12, 12) };
}

function WeatherCanvas({ effect, wind = 0, storm = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, raf = 0, parts = [], flash = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const slant = effect === 'rain' ? Math.min(wind, 50) / 12 : 0; // салхитай бол бороо налуу орно
    const windPush = effect === 'snow' ? Math.min(wind, 50) / 25 : 0;

    function resize() {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const area = w * h;
      const target = effect === 'rain' ? area / 7000 : effect === 'snow' ? area / 11000 : area / 26000;
      const n = Math.round(Math.min(target, effect === 'rain' ? 260 : 160));
      parts = Array.from({ length: n }, () => makeParticle(effect, w, h, true));
    }

    function frame() {
      ctx.clearRect(0, 0, w, h);
      if (effect === 'rain') {
        ctx.lineCap = 'round';
        for (const p of parts) {
          ctx.strokeStyle = `rgba(165,195,240,${p.a + 0.15})`;
          ctx.lineWidth = 1.3;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + slant * (p.len / 10), p.y + p.len); ctx.stroke();
          p.y += p.v; p.x += slant;
          if (p.y > h + 20) Object.assign(p, makeParticle('rain', w, h, false));
        }
        if (storm) {
          if (flash <= 0 && Math.random() < 0.002) flash = 1;
          if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash * 0.35})`; ctx.fillRect(0, 0, w, h); flash -= 0.06; }
        }
      } else if (effect === 'snow') {
        for (const p of parts) {
          p.drift += 0.01 * p.sway;
          p.y += p.v; p.x += Math.sin(p.drift) * p.sway * 0.6 + windPush;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.fill();
          ctx.lineWidth = 0.8; ctx.strokeStyle = 'rgba(111,178,255,.55)'; ctx.stroke(); // цагаан дэвсгэр дээр харагдахын тулд
          if (p.y > h + 10 || p.x > w + 20) Object.assign(p, makeParticle('snow', w, h, false));
        }
      } else if (effect === 'wind') {
        const t = performance.now() / 1000;
        for (const p of parts) {
          if (p.leaf) {
            p.x += p.v; p.y += Math.sin(t * 2 + p.wob) * 1.4; p.rot += p.spin;
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * 0.45, 0, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-p.s, 0); ctx.lineTo(p.s, 0); ctx.stroke();
            ctx.restore();
          } else {
            p.x += p.v;
            ctx.strokeStyle = `rgba(111,178,255,${p.a})`; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(p.x, p.y);
            ctx.quadraticCurveTo(p.x + p.len / 2, p.y + p.curve, p.x + p.len, p.y); ctx.stroke();
          }
          if (p.x > w + 200) Object.assign(p, makeParticle('wind', w, h, false));
        }
      }
      raf = requestAnimationFrame(frame);
    }

    const onVis = () => { cancelAnimationFrame(raf); if (!document.hidden) raf = requestAnimationFrame(frame); };
    resize();
    raf = requestAnimationFrame(frame);
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVis);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', onVis); };
  }, [effect, wind, storm]);

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[45]" />;
}

/** Гадаа цаг агаарын дагуу сайт дээр бороо / цас / салхи. Хэрэглэгч доод буланд унтрааж болно. */
export default function WeatherEffects() {
  const reduce = useReducedMotion();
  const [w, setW] = useState(null);
  const [off, setOff] = useState(() => { try { return localStorage.getItem(OFF_KEY) === '1'; } catch { return false; } });

  useEffect(() => {
    let alive = true;
    const load = () => api.weather().then((d) => alive && setW(d)).catch(() => {});
    load();
    const t = setInterval(load, 15 * 60_000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const toggle = () => {
    setOff((o) => { try { localStorage.setItem(OFF_KEY, o ? '0' : '1'); } catch { /* ignore */ } return !o; });
  };

  if (!w || w.mode === 'off') return null;
  const active = w.effect !== 'none';
  const showFx = active && !off && !reduce;

  return (
    <>
      {showFx && <WeatherCanvas effect={w.effect} wind={w.wind} storm={w.storm} />}
      {(active || w.temp !== null) && (
        <AnimatePresence>
          <motion.div key="wx" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 }}
            className="fixed z-[64] flex items-center gap-2 rounded-full bg-white/90 py-1.5 pl-3 pr-1.5 text-xs font-bold text-ink shadow-lg ring-1 ring-brand-navy/10 backdrop-blur"
            style={{ left: 'max(16px, calc(env(safe-area-inset-left, 0px) + 16px))', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }}>
            <Icon name={ICON[w.effect] ?? 'sun'} className="h-4 w-4 text-brand-blue" />
            <span className="tabular-nums">{w.temp !== null ? `${w.temp > 0 ? '+' : ''}${w.temp}°` : ''} {w.city}</span>
            {active && (
              <button onClick={toggle} aria-pressed={!off} title={off ? 'Эффект асаах' : 'Эффект унтраах'}
                className={`rounded-full px-2.5 py-1 text-[.68rem] font-extrabold transition ${off ? 'bg-brand-mist text-ink-soft' : 'bg-brand-blue text-white'}`}>
                {w.label}{off ? ' · унтраасан' : ''}
              </button>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </>
  );
}
