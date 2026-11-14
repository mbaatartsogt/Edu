import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';
import { useContent } from '../../../lib/content';
import Icon from '../../ui/Icon';
import { SeasonDecor } from '../../effects/Season';

const ease = [0.22, 1, 0.36, 1];
const DEFAULT_ART = '/images/hero-banner.jpg';
const ART_W = 1800, ART_H = 967;
// Анхдагч баннерийн мозайк торны байрлал (зургийн пикселээр): эхлэх x, нүдний хэмжээ
const GRID = { x0: 139, cell: 124 };

// Баннерийн зүүн дээд буланд байдаг жижиг градиент дөрвөлжингүүд
const cornerTiles = [
  'bg-gradient-to-b from-brand-yellow/90 to-white',
  'bg-gradient-to-b from-brand-blue to-white',
  'bg-white',
  'bg-gradient-to-b from-brand-yellow/90 to-white',
];

// Мозайк дээр гялалзах нүднүүд: [багана, мөр, өнгө] — хүүхдүүдийн толгойг дарахгүй байрлалууд
const twinkles = [
  [1, 0, 'from-white to-brand-sky/60'], [5, 0, 'from-brand-yellow to-white'], [7, 0, 'from-brand-blue to-white'],
  [9, 1, 'from-white to-[#cfe1ff]'], [3, 0, 'from-brand-royal to-brand-blue'], [11, 0, 'from-brand-yellow/90 to-white'],
  [4, 1, 'from-white to-brand-sky/70'], [12, 1, 'from-brand-blue to-[#9cc4ff]'], [8, 0, 'from-[#cfe1ff] to-white'],
];

const floatCards = [
  { icon: 'users', title: '15 хүүхэд', sub: 'нэг ангид', pos: 'left-[9%] top-[6%]', delay: 1.1, depth: 26 },
  { icon: 'chat', title: 'Ярианы клуб', sub: 'Native speaker-тэй', pos: 'right-[2%] top-[42%] hidden xl:block', delay: 1.3, depth: 34 },
  { icon: 'clock', title: '90 минут', sub: 'долоо хоногт 3 удаа', pos: 'right-[16%] top-[6%]', delay: 1.5, depth: 18 },
];

/** Цайвар цэнхэр долгионтой хэлбэр — аажуухан хэлбэрээ өөрчилнө */
const BLOB_A = 'M0 40C90 10 150 110 230 100S370 40 440 80S480 230 530 290S620 410 570 480S420 510 360 570S300 720 190 700S60 610 0 640Z';
const BLOB_B = 'M0 70C110 20 170 90 250 70S380 20 450 70S500 250 550 310S600 430 540 500S400 520 340 590S270 700 170 690S50 630 0 610Z';
function SoftBlob({ className = '', animate }) {
  return (
    <svg viewBox="0 0 600 700" aria-hidden="true" className={`pointer-events-none absolute ${className}`} preserveAspectRatio="none">
      <motion.path fill="#E6F0FF" initial={{ d: BLOB_A }}
        animate={animate ? { d: [BLOB_A, BLOB_B, BLOB_A] } : undefined}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }} />
    </svg>
  );
}

const isDesktop = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;

/** object-cover хийсэн зургийн бодит байрлал, хэмжээг (px) тооцно — мозайк дээр яг тааруулахад */
function useCoverRect(ref) {
  const [r, setR] = useState(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const calc = () => {
      const w = el.clientWidth, h = el.clientHeight;
      const s = Math.max(w / ART_W, h / ART_H);
      setR({ s, x: (w - ART_W * s) * (isDesktop() ? 0.16 : 0.28), y: (h - ART_H * s) / 2 });
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return r;
}

export default function MosaicHero() {
  const ref = useRef(null);
  const artRef = useRef(null);
  const reduce = useReducedMotion();
  const { settings } = useContent();
  const [artFailed, setArtFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [revealed, setRevealed] = useState(!!reduce);
  const art = !artFailed && settings.heroImage ? settings.heroImage : DEFAULT_ART;
  const isDefault = art === DEFAULT_ART;
  const rect = useCoverRect(artRef);

  // Scroll parallax
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const yArt = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 70]);
  const yCopy = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 40]);

  // Хулганы parallax (зөвхөн хулганатай төхөөрөмж)
  const mx = useMotionValue(0), my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 18 }), sy = useSpring(my, { stiffness: 60, damping: 18 });
  const artX = useTransform(sx, (v) => v * -10), artY = useTransform(sy, (v) => v * -8);
  const tileX = useTransform(sx, (v) => v * 8), tileY = useTransform(sy, (v) => v * 6);
  const onMove = (e) => {
    if (reduce || e.pointerType !== 'mouse') return;
    const b = ref.current.getBoundingClientRect();
    mx.set(((e.clientX - b.left) / b.width - 0.5) * 2);
    my.set(((e.clientY - b.top) / b.height - 0.5) * 2);
  };
  const onLeave = () => { mx.set(0); my.set(0); };

  // Зураг кэшээс шууд ачаалагдсан бол onLoad алдагдахаас сэргийлнэ
  const imgRef = useRef(null);
  useEffect(() => { if (imgRef.current?.complete) setLoaded(true); }, [art]);

  // Пиксел reveal дууссаны дараа давхаргыг авна
  useEffect(() => {
    if (reduce || !loaded) return;
    const t = setTimeout(() => setRevealed(true), 1700);
    return () => clearTimeout(t);
  }, [loaded, reduce]);

  const words = [['Back', 'every', 'fall'], ['Better', 'every', 'year']];
  const cols = 9, rows = 5;

  return (
    <section ref={ref} onPointerMove={onMove} onPointerLeave={onLeave}
      className="relative isolate overflow-hidden bg-white" aria-labelledby="hero-title">
      {/* Зураг */}
      <motion.div style={{ y: yArt }}
        className="relative h-[clamp(260px,62vw,420px)] w-full md:absolute md:inset-y-0 md:right-0 md:h-auto md:w-[64%] lg:w-[62%]">
        <motion.div ref={artRef} style={{ x: artX, y: artY }} className="absolute -inset-3 overflow-hidden md:left-0">
          <motion.div className="relative h-full w-full"
            animate={reduce ? undefined : { scale: [1, 1.035, 1] }} transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}>
            <picture>
              {isDefault && <source srcSet="/images/hero-banner.webp" type="image/webp" />}
              <img ref={imgRef} src={art} alt="MindEdu-гийн англи хэлний сургалтанд суралцаж буй хүүхдүүд" fetchpriority="high"
                onLoad={() => setLoaded(true)} onError={() => { setArtFailed(true); setLoaded(true); }}
                className="h-full w-full object-cover object-[28%_center] md:object-[16%_center]" />
            </picture>

            {/* Мозайкийн нүднүүд гялалзана (анхдагч баннерийн торонд яг таарна) */}
            {!reduce && isDefault && rect && twinkles.map(([c, r, cls], i) => (
              <motion.span key={i} aria-hidden="true" className={`absolute bg-gradient-to-b ${cls}`}
                style={{ left: rect.x + (GRID.x0 + c * GRID.cell) * rect.s, top: rect.y + r * GRID.cell * rect.s, width: GRID.cell * rect.s + 0.5, height: GRID.cell * rect.s + 0.5 }}
                initial={{ opacity: 0 }} animate={{ opacity: [0, 0.95, 0.95, 0] }}
                transition={{ duration: 2.6, times: [0, 0.2, 0.7, 1], repeat: Infinity, repeatDelay: 3 + (i % 4) * 1.7, delay: 2 + i * 0.9 }} />
            ))}
          </motion.div>
        </motion.div>

        {/* Пиксел reveal: өнгөт дөрвөлжингүүд диагоналаар алга болж зураг нээгдэнэ */}
        {!revealed && (
          <div aria-hidden="true" className="absolute inset-0 z-[2] grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}>
            {Array.from({ length: cols * rows }, (_, i) => {
              const x = i % cols, y = Math.floor(i / cols);
              const tint = (x * 7 + y * 3) % 5;
              return (
                <motion.span key={i}
                  className={tint === 0 ? 'bg-brand-blue' : tint === 1 ? 'bg-brand-yellow' : tint === 2 ? 'bg-[#DCEAFF]' : 'bg-white'}
                  initial={{ opacity: 1, scale: 1.02 }} animate={loaded ? { opacity: 0, scale: 0.5 } : undefined}
                  transition={{ duration: 0.45, ease, delay: (x + y) * 0.07 + (tint === 0 ? 0.08 : 0) }} />
              );
            })}
          </div>
        )}

        <span aria-hidden="true" className="absolute inset-y-0 -left-8 z-[3] hidden w-[calc(20%+2rem)] bg-gradient-to-r from-white from-[12%] via-white/80 to-transparent md:block" />
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 z-[3] h-16 bg-gradient-to-t from-white to-transparent md:hidden" />

        {/* Хөвж буй мэдээллийн картууд */}
        <div className="absolute inset-0 z-[4] hidden md:block">
          {floatCards.map((c) => <FloatCard key={c.title} card={c} sx={sx} sy={sy} reduce={reduce} />)}
        </div>
      </motion.div>

      <SoftBlob animate={!reduce} className="-left-24 top-[38%] hidden h-[115%] w-[46%] -translate-y-1/3 md:block" />
      <motion.div aria-hidden="true" style={{ x: tileX, y: tileY }} className="absolute -left-3 top-0 hidden pl-3 [perspective:600px] md:flex">
        {cornerTiles.map((c, i) => (
          <motion.span key={i} className={`h-[clamp(48px,5.6vw,92px)] w-[clamp(48px,5.6vw,92px)] origin-top ${c}`}
            initial={reduce ? false : { opacity: 0, rotateX: -90 }} animate={{ opacity: 1, rotateX: 0 }}
            transition={{ delay: 0.2 + i * 0.12, duration: 0.8, ease }} />
        ))}
      </motion.div>
      <SeasonDecor />

      <div className="wrap relative md:flex md:min-h-[clamp(500px,40vw,700px)] md:items-center">
        <motion.div style={{ y: yCopy }} className="relative z-10 grid gap-6 pb-14 pt-4 md:max-w-[min(34rem,37%)] md:py-16">
          <motion.span initial={reduce ? false : { opacity: 0, y: 14, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.6, ease }}
            className="inline-flex w-fit items-center gap-2.5 rounded-full bg-brand-mist py-1.5 pl-1.5 pr-4 text-sm font-semibold text-brand-royal">
            <b className="relative rounded-full bg-brand-yellow px-2.5 py-1 text-[.72rem] font-extrabold tracking-wider text-ink">
              {!reduce && <span className="absolute inset-0 animate-ping rounded-full bg-brand-yellow/60 [animation-duration:2.4s]" aria-hidden="true" />}
              <span className="relative">2026–2027</span>
            </b>
            Намрын элсэлт явагдаж байна
          </motion.span>

          <h1 id="hero-title" className="text-[clamp(2.4rem,3.7vw,4.4rem)] font-normal leading-[1.08] tracking-tight text-brand-blue">
            {words.map((line, li) => (
              <span key={li} className="block">
                {line.map((w, wi) => (
                  <span key={w + wi} className="inline-block overflow-hidden pb-1 align-bottom">
                    <motion.span className="inline-block"
                      initial={reduce ? false : { y: '110%', rotate: 6, filter: 'blur(6px)' }} animate={{ y: 0, rotate: 0, filter: 'blur(0px)' }}
                      transition={{ duration: 0.8, ease, delay: 0.25 + li * 0.3 + wi * 0.09 }}>
                      {w}{wi < line.length - 1 ? ' ' : ''}
                    </motion.span>
                  </span>
                ))}
              </span>
            ))}
          </h1>

          <motion.p className="max-w-[44ch] text-base text-ink-soft lg:text-lg" initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.8, ease }}>
            8–18 насны хүүхэд, өсвөр үеийнхэнд зориулсан англи хэлний хөтөлбөр. Жижиг анги, туршлагатай багш, ярианы дадлага — хүүхэд тань жил бүр ахиц гаргана.
          </motion.p>

          <motion.div className="flex flex-wrap items-center gap-x-6 gap-y-3" initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.05, duration: 0.6, ease }}>
            <motion.a href="#enroll" whileHover={reduce ? undefined : { y: -3 }} whileTap={{ scale: 0.97 }}
              className="group relative inline-flex min-w-[13rem] items-center justify-center gap-2 overflow-hidden rounded-full bg-brand-blue px-9 py-4 text-base font-bold uppercase tracking-wide text-white shadow-glow transition-colors hover:bg-brand-royal">
              {!reduce && (
                <motion.span aria-hidden="true" className="absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/45 to-transparent"
                  animate={{ x: ['0%', '480%'] }} transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 3.2, ease: 'easeInOut', delay: 2 }} />
              )}
              <span className="relative">Enroll now</span>
              <Icon name="arrow" className="relative h-[18px] w-[18px] transition-transform group-hover:translate-x-1" strokeWidth={2.6} />
            </motion.a>
            <a href="#programs" className="group py-2 font-bold text-brand-blue">
              <span className="bg-gradient-to-r from-brand-blue to-brand-blue bg-[length:0%_2px] bg-left-bottom bg-no-repeat pb-0.5 transition-[background-size] duration-300 group-hover:bg-[length:100%_2px]">Хөтөлбөр үзэх</span>
              <span className="ml-1 inline-block transition-transform group-hover:translate-x-1">→</span>
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function FloatCard({ card, sx, sy, reduce }) {
  const x = useTransform(sx, (v) => v * card.depth);
  const y = useTransform(sy, (v) => v * card.depth * 0.7);
  return (
    <motion.div style={{ x, y }} className={`absolute ${card.pos}`}>
      <motion.div initial={reduce ? false : { opacity: 0, scale: 0.6, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: card.delay, type: 'spring', stiffness: 220, damping: 16 }}>
        <motion.div animate={reduce ? undefined : { y: [0, -9, 0] }} transition={{ duration: 3.6 + card.depth / 20, repeat: Infinity, ease: 'easeInOut', delay: card.delay }}
          className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/85 py-2.5 pl-2.5 pr-4 shadow-[0_18px_40px_-14px_rgba(6,18,58,.35)] backdrop-blur-md">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-sky to-brand-blue text-white">
            <Icon name={card.icon} className="h-5 w-5" />
          </span>
          <span className="grid leading-tight">
            <b className="text-sm font-extrabold text-ink">{card.title}</b>
            <span className="text-xs font-semibold text-ink-soft">{card.sub}</span>
          </span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
