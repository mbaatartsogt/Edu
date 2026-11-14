import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { method } from '../../data/content';
import { SectionHead } from '../ui/common';

/** Цэнхэр хадаас (push pin) */
function PushPin({ delay }) {
  const reduce = useReducedMotion();
  return (
    <motion.svg viewBox="0 0 60 80" aria-hidden="true"
      className="absolute left-1/2 top-0 h-16 w-12 -translate-x-1/2 -translate-y-6 drop-shadow-[0_6px_6px_rgba(0,30,90,.35)]"
      initial={reduce ? false : { scale: 0, y: -30 }} whileInView={{ scale: 1, y: 0 }} viewport={{ once: true }}
      transition={{ type: 'spring', stiffness: 400, damping: 14, delay }}>
      <ellipse cx="30" cy="70" rx="12" ry="4" fill="rgba(0,20,60,.18)" />
      <path d="M28.6 44h2.8l-.6 26h-1.6z" fill="#8f9bb0" />
      <path d="M16 38c0-4.5 6-7 14-7s14 2.5 14 7-6 8-14 8-14-3.5-14-8z" fill="#0B45C9" />
      <path d="M22 12h16l-2 22H24z" fill="#1F5FF0" />
      <ellipse cx="30" cy="12" rx="13" ry="7" fill="#3E7CFF" />
      <ellipse cx="25" cy="10" rx="4.5" ry="2.2" fill="#fff" opacity=".65" />
      <path d="M25 16l-1 16" stroke="#fff" strokeOpacity=".35" strokeWidth="2" strokeLinecap="round" />
    </motion.svg>
  );
}

function Note({ label, text, rotate, i }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={`relative w-full max-w-[400px] justify-self-center ${i ? 'md:mt-[-40px]' : 'md:mt-24'}`}
      initial={reduce ? false : { opacity: 0, y: -90, rotate: rotate * 3 }}
      whileInView={{ opacity: 1, y: 0, rotate }}
      whileHover={{ rotate: 0, scale: 1.03, transition: { duration: 0.3 } }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ type: 'spring', stiffness: 90, damping: 13, delay: i * 0.18 }}
    >
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-white via-white to-[#EEF1F6] px-8 pb-8 pt-20 shadow-[0_34px_50px_-22px_rgba(0,30,90,.55)] sm:px-10">
        {/* Буланд хуйларсан цаас */}
        <span aria-hidden="true"
          className={`absolute h-14 w-14 ${i ? 'right-0 top-0 rounded-bl-[38px] bg-gradient-to-bl' : 'bottom-0 left-0 rounded-tr-[38px] bg-gradient-to-tr'} from-[#C9D0DC] via-[#F4F6FA] to-white shadow-[0_0_14px_rgba(0,0,0,.12)]`} />
        <p className="font-hand text-[clamp(1.55rem,4.6vw,2.05rem)] uppercase leading-[1.15] text-ink">
          <b className="mr-2 font-sans text-[.82em] font-black tracking-tight text-black">{label} –</b>
          {text}
        </p>
      </div>
      <PushPin delay={0.35 + i * 0.18} />
    </motion.div>
  );
}

export default function LearnLive() {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const yQ = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [80, -80]);
  const rotQ = useTransform(scrollYProgress, [0, 1], reduce ? [12, 12] : [-4, 24]);
  const yBook = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-40, 60]);
  const yLetters = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [60, -60]);

  return (
    <section ref={ref} className="band bg-grid-blue text-white" aria-labelledby="method-title"
      style={{ backgroundImage: 'linear-gradient(rgb(255 255 255 / .13) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / .13) 1px, transparent 1px), linear-gradient(180deg, #8EC2FF 0%, rgb(var(--c-blue)) 70%)', backgroundSize: '36px 36px, 36px 36px, 100% 100%' }}>
      {/* Чимэглэл: том шар үсэг, бүдгэрсэн 3D ном ба асуултын тэмдэг */}
      <motion.span style={{ y: yLetters }} aria-hidden="true"
        className="pointer-events-none absolute -right-10 top-6 select-none text-[clamp(14rem,34vw,26rem)] font-black leading-[.8] tracking-tighter text-brand-yellow">
        Aa
      </motion.span>
      <motion.span style={{ y: yBook }} aria-hidden="true"
        className="pointer-events-none absolute -left-16 -top-6 h-40 w-56 rotate-[-18deg] rounded-[28px] bg-gradient-to-br from-[#5B9DFF] to-brand-royal opacity-80 blur-[6px] shadow-[inset_0_-14px_0_rgba(255,255,255,.35)]" />
      <motion.span style={{ y: yQ, rotate: rotQ }} aria-hidden="true"
        className="pointer-events-none absolute -bottom-10 right-[4%] select-none bg-gradient-to-b from-[#7FB2FF] via-brand-blue to-brand-royal bg-clip-text text-[clamp(10rem,22vw,17rem)] font-black leading-none text-transparent blur-[2.5px] drop-shadow-[0_24px_30px_rgba(0,20,80,.45)]">
        ?
      </motion.span>

      <div className="wrap relative">
        <SectionHead id="method-title" light eyebrow="Сургалтын арга зүй"
          title={<>Learn it. <b className="font-extrabold">Live it.</b></>}
          lead="Онолоо ойлгож сураад, бодит харилцаанд хэрэглэж дадна. Хичээл бүр энэ хоёр алхмаас бүрддэг." />
        <div className="grid gap-16 pt-6 md:grid-cols-2 md:gap-10">
          {method.map((m, i) => <Note key={m.label} {...m} i={i} />)}
        </div>
      </div>
    </section>
  );
}
