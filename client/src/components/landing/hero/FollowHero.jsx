import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, useTransform } from 'framer-motion';
import { useContent } from '../../../lib/content';
import Icon from '../../ui/Icon';
import { SeasonDecor } from '../../effects/Season';
import Mascot from './Mascot';
import { ubTime, useCursor } from './useCursor';

const ease = [0.22, 1, 0.36, 1];
const greetings = ['Hello! 👋', "Let's learn!", 'Сайн уу!', 'Good job! ⭐', 'Join us!'];

/** Админаас оруулсан дүр (тунгалаг PNG) — курсор руу 3D байдлаар эргэнэ */
function CustomCharacter({ src, x, y, onPoke, excited }) {
  const rotY = useTransform(x, (v) => v * 16);
  const rotX = useTransform(y, (v) => v * -9);
  const tx = useTransform(x, (v) => v * 14);
  const shadowX = useTransform(x, (v) => v * -18);
  return (
    <div className="relative h-full [perspective:1100px]" onClick={onPoke}>
      <motion.span aria-hidden="true" style={{ x: shadowX }} className="absolute bottom-0 left-1/2 h-6 w-[60%] -translate-x-1/2 translate-y-1/2 rounded-[50%] bg-black/20 blur-xl" />
      <motion.img src={src} alt="MindEdu-гийн дүр" draggable="false"
        style={{ rotateY: rotY, rotateX: rotX, x: tx, transformOrigin: '50% 85%' }}
        animate={excited ? { y: [0, -30, 0] } : { y: [0, -6, 0] }}
        transition={excited ? { duration: 0.55 } : { duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
        className="h-full w-auto max-w-none cursor-pointer object-contain object-bottom [filter:drop-shadow(0_30px_30px_rgba(6,18,58,.18))]" />
    </div>
  );
}

export default function FollowHero() {
  const { settings } = useContent();
  const reduce = useReducedMotion();
  const stage = useRef(null);
  const { x, y, near } = useCursor(stage);
  const [time, setTime] = useState(ubTime);
  const [bubble, setBubble] = useState(null);
  const [excited, setExcited] = useState(false);
  const gi = useRef(0);
  const bubbleTimer = useRef();

  useEffect(() => { const t = setInterval(() => setTime(ubTime()), 15_000); return () => clearInterval(t); }, []);

  const say = (text) => {
    setBubble({ text, id: Date.now() });
    clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => setBubble(null), 2600);
  };
  useEffect(() => {
    const t = setTimeout(() => say(greetings[0]), 1400);
    return () => { clearTimeout(t); clearTimeout(bubbleTimer.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const poke = () => {
    gi.current = (gi.current + 1) % greetings.length;
    say(greetings[gi.current]);
    if (reduce) return;
    setExcited(true);
    setTimeout(() => setExcited(false), 600);
  };

  // Ар талын том "MINDEDU" бичиг курсорын эсрэг бага зэрэг хөдөлнө
  const bgX = useTransform(x, (v) => v * -24);
  const bubbleX = useTransform(x, (v) => v * 10);

  return (
    <section className="relative isolate overflow-hidden bg-[#F3F5F9]" aria-labelledby="hero-title">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(10,108,245,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(10,108,245,.05)_1px,transparent_1px)] bg-[size:56px_56px]" />
      <motion.p aria-hidden="true" style={{ x: bgX }}
        className="pointer-events-none absolute inset-x-0 top-[14%] -z-10 select-none text-center text-[clamp(5rem,19vw,17rem)] font-black leading-none tracking-tighter text-white">
        MINDEDU
      </motion.p>
      <SeasonDecor />

      <div className="wrap relative flex min-h-[clamp(600px,52vw,780px)] flex-col">
        {/* Дээд мөр */}
        <div className="flex items-center justify-between gap-3 pt-5 text-[.7rem] font-bold uppercase tracking-[.16em] text-ink-soft md:pt-7">
          <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-brand-blue" />MindEdu English</span>
          <span className="hidden tabular-nums sm:inline">Улаанбаатар · {time}</span>
          <a href="#enroll" className="rounded-full bg-brand-navy px-4 py-2 text-[.68rem] tracking-[.12em] text-white transition hover:bg-brand-blue">Элсэлт 2026–2027</a>
        </div>

        {/* Хажуугийн шошгууд */}
        <a href="#programs" className="absolute left-4 top-1/2 z-20 hidden -translate-y-1/2 text-[.68rem] font-bold uppercase tracking-[.18em] text-ink-soft hover:text-brand-blue sm:left-6 md:block lg:left-8">Хөтөлбөр</a>
        <a href="#teachers" className="absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 items-center gap-2 text-[.68rem] font-bold uppercase tracking-[.18em] text-ink-soft hover:text-brand-blue sm:right-6 md:flex lg:right-8">
          Багш нар <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-navy text-white"><Icon name="arrow" className="h-3 w-3" strokeWidth={3} /></span>
        </a>

        {/* Дүр */}
        <div ref={stage} className="pointer-events-none relative mx-auto mt-6 h-[clamp(300px,78vw,420px)] md:absolute md:bottom-0 md:left-[54%] md:mt-0 md:h-[84%] md:-translate-x-1/2 lg:left-1/2">
          <motion.div className="pointer-events-auto h-full" initial={reduce ? false : { opacity: 0, y: 60, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 1, ease }}>
            {settings.heroCharacter
              ? <CustomCharacter src={settings.heroCharacter} x={x} y={y} onPoke={poke} excited={excited} />
              : <Mascot x={x} y={y} near={near} onPoke={poke} excited={excited} />}
          </motion.div>
          <AnimatePresence>
            {bubble && (
              <motion.div key={bubble.id} style={{ x: bubbleX }} role="status"
                className="absolute right-[-6%] top-[2%] rounded-2xl rounded-bl-sm bg-white px-4 py-2.5 text-sm font-extrabold text-brand-navy shadow-[0_14px_30px_-10px_rgba(6,18,58,.3)] md:right-[-12%] md:text-base"
                initial={{ opacity: 0, scale: 0.6, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8, y: -6 }}
                transition={{ type: 'spring', stiffness: 380, damping: 20 }}>
                {bubble.text}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Доод мөр: том гарчиг + тайлбар */}
        <div className="relative z-20 mt-auto grid gap-6 pb-8 pt-6 md:grid-cols-[1fr_auto] md:items-end md:pb-10">
          <h1 id="hero-title" className="text-[clamp(2.7rem,6.3vw,6.6rem)] font-black uppercase leading-[.88] tracking-[-.04em] text-ink">
            {['Better', 'every year'].map((line, i) => (
              <span key={line} className="block overflow-hidden">
                <motion.span className="block whitespace-nowrap" initial={reduce ? false : { y: '105%' }} animate={{ y: 0 }} transition={{ duration: 0.9, ease, delay: 0.3 + i * 0.12 }}>
                  {i ? <>every year <span className="text-brand-blue">-26</span></> : line}
                </motion.span>
              </span>
            ))}
            <span className="sr-only"> — Back every fall. MindEdu англи хэлний сургалтын төв</span>
          </h1>
          <motion.div className="grid max-w-[22rem] gap-4 md:justify-items-end md:text-right" initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.6, ease }}>
            <p className="text-sm text-ink-soft">8–18 насны хүүхдэд зориулсан англи хэлний хөтөлбөр. Жижиг анги, туршлагатай багш, ярианы дадлага.</p>
            <div className="flex flex-wrap items-center gap-3 md:justify-end">
              <a href="#programs" className="text-sm font-bold text-brand-blue hover:underline">Хөтөлбөр үзэх →</a>
              <a href="#enroll" className="inline-flex items-center gap-2 rounded-full bg-brand-blue px-6 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-glow transition hover:-translate-y-0.5 hover:bg-brand-royal">
                Enroll now <Icon name="arrow" className="h-4 w-4" strokeWidth={2.8} />
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
