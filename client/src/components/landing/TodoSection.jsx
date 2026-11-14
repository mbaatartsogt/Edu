import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { site, todoItems } from '../../data/content';
import { Reveal } from '../ui/motion';
import { Ring, SectionHead } from '../ui/common';
import Icon from '../ui/Icon';

const ease = [0.22, 1, 0.36, 1];

function Rich({ text }) {
  return text.split('**').map((part, i) => (i % 2 ? <b key={i} className="font-black text-brand-blue">{part}</b> : part));
}

function Notepad() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="relative w-full max-w-[620px] justify-self-center rounded-[22px] bg-white px-6 pb-8 pt-9 shadow-card sm:px-12 sm:pb-11 sm:pt-12"
      initial={reduce ? false : { opacity: 0, rotate: -6, y: 60 }}
      whileInView={{ opacity: 1, rotate: -1.2, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.9, ease }}
    >
      {/* Спираль цагиргууд */}
      <div className="absolute -top-3.5 inset-x-0 flex justify-evenly" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <i key={i} className="h-[30px] w-3.5 rounded-lg bg-gradient-to-b from-[#C9D7EE] to-[#8FA4C7] shadow-[inset_0_2px_2px_rgba(255,255,255,.7)]" />
        ))}
      </div>
      <span className="pointer-events-none absolute inset-x-5 -bottom-3 -z-10 h-8 rounded-b-[22px] bg-white/60" aria-hidden="true" />

      <h3 className="relative mb-6 inline-block -rotate-2 font-hand text-[clamp(2.6rem,6vw,3.6rem)] leading-none text-brand-blue">
        TO DO LIST
        <motion.span className="absolute -bottom-1 left-[4%] right-[-6%] -z-10 h-2.5 origin-left rounded-full bg-brand-yellow/85"
          initial={reduce ? false : { scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.6, ease }} />
      </h3>

      <ul className="grid">
        {todoItems.map((item, i) => (
          <motion.li key={item}
            className="flex items-center gap-4 border-b-2 border-dashed border-line py-3.5 text-[clamp(.88rem,2.2vw,1.05rem)] font-bold uppercase tracking-wide last:border-0"
            initial={reduce ? false : { opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
            transition={{ delay: 0.35 + i * 0.12, duration: 0.5, ease }}>
            <span className="check3d" aria-hidden="true">
              <motion.svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                <motion.path d="M5 12.5l4.5 4.5L19 7.5"
                  initial={reduce ? false : { pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }}
                  transition={{ delay: 0.6 + i * 0.12, duration: 0.4 }} />
              </motion.svg>
            </span>
            <span><Rich text={item} /></span>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}

function Calendar3D() {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const rotY = useTransform(scrollYProgress, [0, 1], reduce ? [-14, -14] : [-28, 4]);
  const rotX = useTransform(scrollYProgress, [0, 1], reduce ? [6, 6] : [14, -2]);

  return (
    <div ref={ref} className="grid justify-items-center gap-6 text-center" id="schedule" style={{ perspective: 900 }}>
      <motion.div role="img" aria-label={`Сургалт 9-р сарын ${site.startDate.day}-нд эхэлнэ`}
        style={{ rotateY: rotY, rotateX: rotX }}
        animate={reduce ? undefined : { y: [0, -10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        className="relative w-[min(280px,78vw)] rounded-[30px] bg-white shadow-[0_26px_0_-8px_#C7D6EF,0_40px_60px_-24px_rgba(0,20,80,.55)]">
        <div className="relative rounded-t-[30px] bg-gradient-to-b from-[#FF6A55] to-[#E5402B] px-2.5 pb-4 pt-6 text-lg font-extrabold tracking-[.14em] text-white">
          {['left-[28%]', 'right-[28%]'].map((p) => (
            <span key={p} className={`absolute -top-3.5 ${p} h-9 w-4 rounded-[9px] bg-gradient-to-b from-[#EAEFF7] to-[#9AAACA]`} />
          ))}
          {site.startDate.month}
        </div>
        <motion.div className="pb-6 pt-3.5 text-[clamp(5rem,16vw,7.4rem)] font-black leading-none tabular-nums"
          initial={reduce ? false : { rotateX: -90, opacity: 0 }} whileInView={{ rotateX: 0, opacity: 1 }} viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.8, ease }} style={{ transformOrigin: 'top' }}>
          {site.startDate.day}
          <small className="mt-1.5 block text-sm font-bold tracking-[.2em] text-ink-soft">{site.startDate.weekday}</small>
        </motion.div>
      </motion.div>
      <Reveal delay={0.2} className="grid max-w-[32ch] justify-items-center gap-4">
        <p className="font-semibold">Хичээл 9-р сарын 14-нд эхэлнэ. Суудал хязгаартай тул эрт бүртгүүлээрэй.</p>
        <a href="#enroll" className="btn-blue !py-3.5">Суудал захиалах <Icon name="arrow" strokeWidth={3} className="h-4 w-4" /></a>
      </Reveal>
    </div>
  );
}

export default function TodoSection() {
  return (
    <section id="about" className="band bg-grid-soft" aria-labelledby="facts-title">
      <Ring className="-left-52 top-10 h-[360px] w-[360px] !border-brand-yellow/50" />
      <div className="wrap relative">
        <SectionHead id="facts-title" eyebrow="Бидний тухай"
          title={<>Энэ намар <b className="font-extrabold">бидний хийх ажил</b></>}
          lead="MindEdu нь хүүхэд бүрт анхаарал хандуулж, англи хэлийг ярьж, сонсож, бичиж сурахад тогтмол хуваарь, жижиг ангиар тусалдаг." />
        <div className="grid items-center gap-14 md:grid-cols-[1.15fr_.85fr]">
          <Notepad />
          <Calendar3D />
        </div>
      </div>
    </section>
  );
}
