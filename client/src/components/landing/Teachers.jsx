import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useContent } from '../../lib/content';
import { Reveal } from '../ui/motion';
import Icon from '../ui/Icon';

const ease = [0.22, 1, 0.36, 1];

/**
 * Зургийг шинжилнэ: тунгалаг дэвсгэртэй (cutout) бол эргэн тойрны хоосон тунгалаг зайг тайрч,
 * хөл нь яг доод ирмэгт буухаар бэлдэнэ. Ингэснээр бүх багш нэг шалан дээр, ижил өндөртэй зогсоно.
 * Тунгалаг биш бол нуман хүрээтэй хөрөг болно.
 */
const figureCache = new Map();
function analyze(src) {
  if (figureCache.has(src)) return figureCache.get(src);
  const job = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const W = img.naturalWidth, H = img.naturalHeight;
        const k = Math.min(1, 360 / Math.max(W, H));
        const w = Math.max(1, Math.round(W * k)), h = Math.max(1, Math.round(H * k));
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, w, h);
        const d = ctx.getImageData(0, 0, w, h).data;
        const alpha = (x, y) => d[(y * w + x) * 4 + 3];
        if (alpha(1, 1) > 16 || alpha(w - 2, 1) > 16) return resolve({ mode: 'photo', src });
        let x0 = w, y0 = h, x1 = -1, y1 = -1;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (d[(y * w + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
          }
        }
        if (x1 < 0) return resolve({ mode: 'photo', src });
        // Бүтэн хэмжээгээр тайрна
        const sx = Math.max(0, Math.floor(x0 / k) - 2), sy = Math.max(0, Math.floor(y0 / k) - 2);
        const sw = Math.min(W - sx, Math.ceil((x1 + 1) / k) - sx + 2), sh = Math.min(H - sy, Math.ceil((y1 + 1) / k) - sy + 2);
        const out = document.createElement('canvas');
        out.width = sw; out.height = sh;
        out.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        out.toBlob((b) => resolve({ mode: 'cutout', src: b ? URL.createObjectURL(b) : src, ratio: sw / sh }), 'image/webp', 0.92);
      } catch {
        resolve({ mode: 'photo', src }); // өөр домэйны зураг
      }
    };
    img.onerror = () => resolve({ mode: 'missing' });
    img.src = src;
  });
  figureCache.set(src, job);
  return job;
}

function useFigure(src) {
  const [fig, setFig] = useState({ mode: src ? 'loading' : 'missing' });
  useEffect(() => {
    if (!src) return setFig({ mode: 'missing' });
    let alive = true;
    analyze(src).then((r) => alive && setFig(r));
    return () => { alive = false; };
  }, [src]);
  return fig;
}

/** Нэг багшийн дүрс: cutout → шалан дээр зогсоно, энгийн зураг → нуман хөрөг, зураггүй → дүрс */
function Figure({ teacher, active }) {
  const fig = useFigure(teacher.photo);
  const initials = teacher.name.replace(/^[А-ЯӨҮA-Z]\.\s*/u, '').trim().slice(0, 1);
  const shadow = (
    <span aria-hidden="true" className={`absolute bottom-0 left-1/2 h-4 -translate-x-1/2 translate-y-1/2 rounded-[50%] bg-black/25 blur-[10px] transition-opacity duration-700 ${active ? 'w-[62%] opacity-100' : 'w-[50%] opacity-60'}`} />
  );
  if (fig.mode === 'loading') return null;
  if (fig.mode === 'cutout') {
    return (
      <div className="relative h-full w-full">
        {shadow}
        {/* Өндрөөр нь тэнцүүлнэ; хэт өргөн (үсэрсэн, гараа дэлгэсэн) зураг хөршөө дарахгүйгээр багтана */}
        <div className="absolute bottom-0 left-1/2 h-full w-[230%] -translate-x-1/2">
          <img src={fig.src} alt="" draggable="false" className="h-full w-full object-contain object-bottom" />
        </div>
      </div>
    );
  }
  return (
    <div className="relative h-full w-full">
      {shadow}
      <div className={`absolute inset-x-[10%] bottom-0 top-[8%] overflow-hidden rounded-b-[2rem] rounded-t-[999px] shadow-[0_24px_40px_-20px_rgba(6,18,58,.4)] ${fig.mode === 'photo' ? 'bg-brand-mist' : 'bg-gradient-to-b from-[#E4EFFF] to-[#AFCFFF]'}`}>
        {fig.mode === 'photo' ? (
          <img src={fig.src} alt="" draggable="false" className="h-full w-full object-cover" />
        ) : (
          <>
            <svg viewBox="0 0 100 130" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
              <circle cx="50" cy="48" r="17" fill="#fff" fillOpacity=".75" />
              <path d="M14 130c3-30 18-46 36-46s33 16 36 46z" fill="#fff" fillOpacity=".75" />
            </svg>
            <span className="absolute inset-x-0 top-[30%] text-center text-3xl font-black text-brand-blue/70">{initials}</span>
          </>
        )}
      </div>
    </div>
  );
}

/** Идэвхтэй багшаас хэр зайтай байгаагаар тайзан дээрх байрлалыг тооцно */
function slot(d, compact) {
  const depth = Math.abs(d);
  const side = Math.sign(d);
  if (depth === 0) return { x: 0, scale: 1, blur: 0, opacity: 1, z: 50 };
  const gap = compact ? [0, 32, 44, 52] : [0, 17, 29, 38, 45];
  const max = gap.length - 1;
  const k = Math.min(depth, max);
  return {
    x: side * gap[k],                      // % — голоос хажуу тийш
    scale: Math.max(0.56, 1 - 0.14 * k),   // хол байх тусам жижиг (бүгд нэг шалан дээр)
    blur: Math.min(4, 1.3 * k),
    opacity: depth > max ? 0 : Math.max(0.6, 1 - 0.12 * k),
    z: 50 - depth,
  };
}

function useCompact() {
  const [c, setC] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const on = () => setC(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return c;
}

export default function Teachers() {
  const { teachers, loading } = useContent();
  const reduce = useReducedMotion();
  const compact = useCompact();
  const [active, setActive] = useState(0);
  const [info, setInfo] = useState(false);
  const stage = useRef(null);
  const n = teachers.length;

  useEffect(() => { if (active >= n && n) setActive(0); }, [n, active]);
  const go = useCallback((i) => { setActive(((i % n) + n) % n); setInfo(false); }, [n]);

  // Хамгийн богино замаар (тойрог) зай: -n/2 … n/2
  const offset = useCallback((i) => {
    let d = i - active;
    if (d > n / 2) d -= n;
    if (d < -n / 2) d += n;
    return d;
  }, [active, n]);

  const order = useMemo(() => teachers.map((t, i) => ({ t, i, d: offset(i) })), [teachers, offset]);
  const cur = teachers[active];

  const onKey = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(active + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(active - 1); }
  };

  if (!loading && !n) return null;
  const pad = (x) => String(x).padStart(2, '0');

  return (
    <section id="teachers" className="band !pb-6 bg-white" aria-labelledby="teachers-title">
      <div className="wrap">
        <Reveal className="mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8">
          <div className="grid gap-3">
            <span className="eyebrow">Багш нар</span>
            <h2 id="teachers-title" className="h2">Танай хүүхдийн <b className="font-extrabold">багш нар</b></h2>
          </div>
          <p className="max-w-[34ch] text-sm text-ink-soft md:text-right">Багш дээр дарж танилцаарай. Сумаар эсвэл гулсуулж солино.</p>
        </Reveal>

        {loading ? <div className="h-[520px] animate-pulse rounded-[2.5rem] bg-brand-mist md:h-[640px]" /> : (
          <div ref={stage} role="region" aria-roledescription="carousel" aria-label="Багш нар" tabIndex={0} onKeyDown={onKey}
            className="relative isolate -mx-4 h-[600px] select-none overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40 sm:mx-0 md:h-[680px]">

            {/* Шал: зөөлөн гэрэлтэй тойрог, бүх багш энэ шугам дээр зогсоно */}
            <span aria-hidden="true" className="pointer-events-none absolute inset-x-[6%] bottom-[27%] h-[16%] translate-y-1/2 rounded-[50%] bg-[radial-gradient(closest-side,#E9F1FF_0%,rgba(233,241,255,.55)_55%,transparent_100%)] md:bottom-[17%]" />

            {/* Дээд мөр: жижиг UI мэдээлэл */}
            <div className="absolute inset-x-0 top-0 z-[60] flex items-start justify-between p-5 text-[.68rem] font-bold uppercase tracking-[.18em] text-ink-soft md:p-7">
              <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-brand-blue" />MindEdu · Teachers</span>
              <span className="font-black tracking-tight text-ink"><span className="text-base">{pad(active + 1)}</span><span className="text-ink-soft"> / {pad(n)}</span></span>
            </div>

            {/* Тайз */}
            <motion.div className="absolute inset-0 cursor-grab active:cursor-grabbing"
              drag={n > 1 ? 'x' : false} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.18}
              onDragEnd={(_, i) => { if (i.offset.x < -60 || i.velocity.x < -400) go(active + 1); else if (i.offset.x > 60 || i.velocity.x > 400) go(active - 1); }}>
              {order.map(({ t, i, d }) => {
                const s = slot(d, compact);
                const isActive = d === 0;
                return (
                  <motion.button key={t.id} type="button" onClick={() => (isActive ? setInfo((x) => !x) : go(i))}
                    aria-label={isActive ? `${t.name} — дэлгэрэнгүй` : `${t.name} багшийг харах`} aria-current={isActive || undefined}
                    tabIndex={Math.abs(d) <= 2 ? 0 : -1}
                    className="absolute bottom-[27%] h-[56%] w-[40%] origin-bottom outline-none sm:w-[30%] md:bottom-[17%] md:h-[68%] md:w-[17%] lg:w-[14%]"
                    style={{ zIndex: s.z, pointerEvents: s.opacity ? 'auto' : 'none' }}
                    initial={false}
                    animate={{ left: `${50 + s.x}%`, x: '-50%', scale: s.scale, opacity: s.opacity, filter: `blur(${s.blur}px) saturate(${isActive ? 1 : 0.85})` }}
                    transition={reduce ? { duration: 0 } : { duration: 0.75, ease }}
                    whileHover={!isActive && !reduce ? { scale: s.scale * 1.03 } : undefined}>
                    <Figure teacher={t} active={isActive} />
                  </motion.button>
                );
              })}
            </motion.div>

            {/* Зүүн/баруун сум (босоо капсул) */}
            {n > 1 && (
              <>
                <button type="button" onClick={() => go(active - 1)} aria-label="Өмнөх багш"
                  className="absolute left-3 top-1/2 z-[60] grid h-14 w-9 -translate-y-1/2 place-items-center rounded-full border border-line bg-white/90 text-ink shadow-sm backdrop-blur transition hover:bg-white hover:shadow md:left-6">
                  <Icon name="arrow" className="h-4 w-4 rotate-180" strokeWidth={2.6} />
                </button>
                <button type="button" onClick={() => go(active + 1)} aria-label="Дараагийн багш"
                  className="absolute right-3 top-1/2 z-[60] grid h-14 w-9 -translate-y-1/2 place-items-center rounded-full border border-line bg-white/90 text-ink shadow-sm backdrop-blur transition hover:bg-white hover:shadow md:right-6">
                  <Icon name="arrow" className="h-4 w-4" strokeWidth={2.6} />
                </button>
              </>
            )}

            {/* Баруун талын босоо жагсаалт — багш бүрийн цэг */}
            {n > 1 && (
              <div className="absolute right-[1.95rem] top-[calc(50%+2.5rem)] z-[60] hidden flex-col gap-1.5 rounded-full border border-line bg-white/90 p-1.5 backdrop-blur md:flex" role="tablist" aria-label="Багш сонгох">
                {teachers.map((t, i) => (
                  <button key={t.id} type="button" role="tab" aria-selected={i === active} aria-label={t.name} onClick={() => go(i)}
                    className={`h-1.5 w-1.5 rounded-full transition-all ${i === active ? 'h-5 bg-brand-blue' : 'bg-ink-soft/30 hover:bg-ink-soft/60'}`} />
                ))}
              </div>
            )}

            {/* Доод мөр: нэр, тэмдгүүд (чип), дэлгэрэнгүй товч */}
            {cur && (
              <div className="absolute inset-x-0 bottom-0 z-[60] grid items-end gap-3 p-4 md:grid-cols-[1fr_auto_1fr] md:gap-6 md:bg-none md:p-7">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div key={cur.id} className="min-w-0"
                    initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0, y: -6 }} transition={{ duration: 0.35, ease }}>
                    {cur.role && <p className="truncate text-[.7rem] font-bold uppercase tracking-[.16em] text-brand-blue">{cur.role}</p>}
                    <p className="truncate text-2xl font-black uppercase leading-none tracking-tight text-ink md:text-[2.1rem]">{cur.name}</p>
                  </motion.div>
                </AnimatePresence>

                <AnimatePresence mode="wait" initial={false}>
                  <motion.ul key={cur.id} className="hidden flex-wrap justify-center gap-2 md:flex"
                    initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reduce ? undefined : { opacity: 0 }} transition={{ duration: 0.3 }}>
                    {cur.badges.slice(0, 3).map((b, bi) => (
                      <motion.li key={b} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * bi, duration: 0.35, ease }}
                        className="flex items-center gap-2 rounded-full border border-line bg-white py-1.5 pl-1.5 pr-4 shadow-sm">
                        <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-mist text-brand-blue">
                          <Icon name={bi === 0 ? 'cap' : bi === 1 ? 'clock' : 'sparkle'} className="h-3.5 w-3.5" />
                        </span>
                        <span className="text-[.72rem] font-extrabold uppercase tracking-wider">{b}</span>
                      </motion.li>
                    ))}
                  </motion.ul>
                </AnimatePresence>

                <div className="mr-16 flex items-center justify-between gap-3 md:mr-0 md:justify-end">
                  <div className="flex flex-wrap gap-1.5 md:hidden">
                    {cur.badges.slice(0, 3).map((b) => <span key={b} className="rounded-full border border-line bg-white px-2.5 py-1 text-[.65rem] font-extrabold uppercase tracking-wider">{b}</span>)}
                  </div>
                  <span className="hidden text-[.68rem] font-bold uppercase tracking-[.16em] text-ink-soft lg:inline">Танилцах</span>
                  <button type="button" onClick={() => setInfo((x) => !x)} aria-expanded={info} aria-label={info ? 'Хаах' : `${cur.name} — танилцуулга`}
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-navy text-white shadow-lg transition hover:bg-brand-blue">
                    <Icon name="plus" className={`h-5 w-5 transition-transform duration-300 ${info ? 'rotate-45' : ''}`} strokeWidth={2.6} />
                  </button>
                </div>
              </div>
            )}

            {/* Танилцуулга карт */}
            <AnimatePresence>
              {info && cur && (
                <motion.div key="info" role="dialog" aria-label={`${cur.name} танилцуулга`}
                  className="absolute bottom-24 right-4 z-[70] w-[min(22rem,calc(100%-2rem))] rounded-3xl border border-line bg-white/95 p-5 shadow-2xl backdrop-blur md:bottom-28 md:right-7"
                  initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.97 }} transition={{ duration: 0.3, ease }}>
                  <p className="text-lg font-extrabold">{cur.name}</p>
                  {cur.role && <p className="text-sm font-bold text-brand-blue">{cur.role}</p>}
                  {cur.bio && <p className="mt-2 text-sm leading-relaxed text-ink-soft">{cur.bio}</p>}
                  {cur.badges.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {cur.badges.map((b) => <span key={b} className="rounded-full bg-brand-mist px-2.5 py-1 text-[.7rem] font-bold text-brand-royal">{b}</span>)}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </section>
  );
}
