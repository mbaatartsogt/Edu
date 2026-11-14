import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { heroStats } from '../../../data/content';
import { Counter } from '../../ui/motion';
import Icon from '../../ui/Icon';
import { SeasonDecor } from '../../effects/Season';

const ease = [0.22, 1, 0.36, 1];
const LINES = [{ text: 'Back every fall', bold: false }, { text: 'Better every year', bold: true }];

// Хөвөх англи үгс: [үг, left%, top%, гүн (parallax), хэмжээ]
const floating = [
  ['Hello!', 6, 16, 30, 'text-2xl'], ['ABC', 84, 12, 18, 'text-3xl'], ['Great job!', 72, 70, 26, 'text-xl'],
  ["Let's talk", 10, 78, 22, 'text-lg'], ['Thank you', 2, 47, 14, 'text-lg'], ['IELTS', 90, 46, 34, 'text-xl'],
  ['Grammar', 28, 88, 16, 'text-base'], ['Speaking', 74, 86, 20, 'text-base'],
];

/**
 * Том гарчгийн үсэг бүр курсороос түлхэгдэнэ (соронз мэт), хөндийрсөн үсгүүд эргэн байрандаа буцна.
 * Гүйцэтгэлд зориулж React state биш, шууд style өөрчилнө (requestAnimationFrame).
 */
function useMagnet(containerRef, reduce) {
  useEffect(() => {
    if (reduce) return undefined;
    const root = containerRef.current;
    if (!root) return undefined;
    const letters = [...root.querySelectorAll('[data-l]')];
    let rects = [], raf = 0, px = -9999, py = -9999;
    const cur = letters.map(() => ({ x: 0, y: 0, r: 0 }));
    const measure = () => {
      letters.forEach((el) => { el.style.transform = ''; });
      rects = letters.map((el) => { const b = el.getBoundingClientRect(); return { cx: b.left + b.width / 2 + scrollX, cy: b.top + b.height / 2 + scrollY }; });
    };
    const tick = () => {
      let moving = false;
      letters.forEach((el, i) => {
        const r = rects[i];
        if (!r) return;
        const dx = r.cx - (px + scrollX), dy = r.cy - (py + scrollY);
        const d = Math.hypot(dx, dy);
        const R = 170;
        const f = d < R ? (1 - d / R) ** 2 : 0;
        const tx = d ? (dx / d) * f * 46 : 0, ty = d ? (dy / d) * f * 46 : 0, tr = f * (dx > 0 ? 14 : -14);
        const c = cur[i];
        c.x += (tx - c.x) * 0.16; c.y += (ty - c.y) * 0.16; c.r += (tr - c.r) * 0.16;
        if (Math.abs(c.x) + Math.abs(c.y) > 0.1 || f) moving = true;
        el.style.transform = `translate(${c.x.toFixed(2)}px, ${c.y.toFixed(2)}px) rotate(${c.r.toFixed(2)}deg)`;
        el.style.color = f > 0.35 ? 'rgb(var(--c-yellow))' : '';
      });
      raf = moving ? requestAnimationFrame(tick) : 0;
    };
    const onMove = (e) => { px = e.clientX; py = e.clientY; if (!raf) raf = requestAnimationFrame(tick); };
    const onLeave = () => { px = -9999; py = -9999; if (!raf) raf = requestAnimationFrame(tick); };
    // Үсгүүд гарч ирэх анимэйшн дууссаны дараа хэмжинэ
    const t = setTimeout(measure, 2300);
    addEventListener('resize', measure);
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerleave', onLeave);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); removeEventListener('resize', measure); root.removeEventListener('pointermove', onMove); root.removeEventListener('pointerleave', onLeave); };
  }, [containerRef, reduce]);
}

function FloatWord({ word, sx, sy, reduce, i }) {
  const [text, left, top, depth, size] = word;
  const x = useTransform(sx, (v) => v * -depth);
  const y = useTransform(sy, (v) => v * -depth * 0.7);
  return (
    <motion.span aria-hidden="true" style={{ left: `${left}%`, top: `${top}%`, x, y }} className="pointer-events-none absolute">
      <motion.span className={`block whitespace-nowrap rounded-full border border-white/25 bg-white/10 px-4 py-1.5 font-extrabold text-white/80 backdrop-blur-sm ${size}`}
        initial={reduce ? false : { opacity: 0, scale: 0.5 }} animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: [0, -10, 0] }}
        transition={{ opacity: { delay: 0.8 + i * 0.12 }, scale: { delay: 0.8 + i * 0.12, type: 'spring' }, y: { duration: 4 + (i % 3), repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 } }}>
        {text}
      </motion.span>
    </motion.span>
  );
}

export default function LettersHero() {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const titleRef = useRef(null);
  useMagnet(titleRef, reduce);

  const mx = useMotionValue(0), my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 50, damping: 16 }), sy = useSpring(my, { stiffness: 50, damping: 16 });
  const onMove = (e) => {
    if (reduce) return;
    const b = ref.current.getBoundingClientRect();
    mx.set(((e.clientX - b.left) / b.width - 0.5) * 2);
    my.set(((e.clientY - b.top) / b.height - 0.5) * 2);
  };
  // Курсорыг дагах гэрлийн толбо
  const glowX = useTransform(sx, (v) => `${50 + v * 50}%`);
  const glowY = useTransform(sy, (v) => `${50 + v * 50}%`);
  const glow = useTransform([glowX, glowY], ([gx, gy]) => `radial-gradient(600px circle at ${gx} ${gy}, rgba(120,180,255,.35), transparent 60%)`);

  let n = 0;
  return (
    <section ref={ref} onPointerMove={onMove} className="bg-grid-blue relative isolate overflow-hidden text-white" aria-labelledby="hero-title">
      {!reduce && <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" style={{ background: glow }} />}
      {floating.map((w, i) => <FloatWord key={w[0]} word={w} i={i} sx={sx} sy={sy} reduce={reduce} />)}
      <SeasonDecor />

      <div className="wrap relative grid min-h-[clamp(560px,48vw,760px)] content-center justify-items-center gap-8 py-20 text-center">
        <motion.span initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}
          className="inline-flex items-center gap-2.5 rounded-full border border-white/25 bg-white/15 py-2 pl-2 pr-4 text-sm font-semibold backdrop-blur">
          <b className="rounded-full bg-brand-yellow px-2.5 py-1 text-[.72rem] font-extrabold tracking-wider text-ink">2026–2027</b>
          Намрын элсэлт явагдаж байна
        </motion.span>

        <h1 id="hero-title" ref={titleRef} aria-label="Back every fall. Better every year." className="cursor-default select-none text-[clamp(2.8rem,8.2vw,8rem)] leading-[.98] tracking-tight">
          {LINES.map((line, li) => (
            <span key={line.text} aria-hidden="true" className={`block ${line.bold ? 'font-black' : 'font-extralight'}`}>
              {line.text.split(' ').map((word, wi) => (
                <span key={wi} className="inline-block whitespace-nowrap">
                  {[...word].map((ch) => {
                    const k = n++;
                    return (
                      <motion.span key={k} className="inline-block" initial={reduce ? false : { opacity: 0, y: 60, rotate: -20 }} animate={{ opacity: 1, y: 0, rotate: 0 }}
                        transition={{ duration: 0.7, ease, delay: 0.1 + k * 0.035 }}>
                        <span data-l className="inline-block will-change-transform [transition:color_.25s]">{ch}</span>
                      </motion.span>
                    );
                  })}
                  {wi < line.text.split(' ').length - 1 && <span className="inline-block w-[.28em]" />}
                </span>
              ))}
            </span>
          ))}
        </h1>

        <motion.p className="lead !text-white/90 mx-auto" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1, duration: 0.8 }}>
          8–18 насны хүүхэд, өсвөр үеийнхэнд зориулсан англи хэлний хөтөлбөр. Үсгүүд дээгүүр хулганаа гүйлгээд үзээрэй ✨
        </motion.p>

        <motion.div className="flex flex-wrap items-center justify-center gap-4" initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.25, duration: 0.6, ease }}>
          <a href="#enroll" className="btn-yellow group">Enroll now <Icon name="arrow" className="h-[18px] w-[18px] transition-transform group-hover:translate-x-1" strokeWidth={3} /></a>
          <a href="#programs" className="px-1.5 py-3 font-bold hover:underline">Хөтөлбөр үзэх →</a>
        </motion.div>

        <motion.dl className="flex flex-wrap justify-center gap-10" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}>
          {heroStats.map((s) => (
            <div key={s.label} className="grid">
              <dd className="order-1 text-3xl font-extrabold leading-none"><Counter to={s.value} suffix={s.suffix} /></dd>
              <dt className="order-2 text-xs opacity-85">{s.label}</dt>
            </div>
          ))}
        </motion.dl>
      </div>
    </section>
  );
}
