import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { useRef } from 'react';
import { benefits } from '../../data/content';
import { Ring, SectionHead } from '../ui/common';
import { Stagger, StaggerItem } from '../ui/motion';
import Icon from '../ui/Icon';

export default function Benefits() {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const rot = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 90]);
  const y = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : -80, reduce ? 0 : 80]);

  return (
    <section ref={ref} className="band bg-grid-blue text-white" aria-labelledby="why-title">
      <motion.div style={{ rotate: rot, y }} className="absolute -bottom-52 -right-56">
        <Ring className="relative h-[440px] w-[440px]" />
      </motion.div>
      <div className="wrap relative">
        <SectionHead id="why-title" light eyebrow="Яагаад MindEdu?"
          title={<>Эцэг эхчүүд <b className="font-extrabold">биднийг сонгодог шалтгаан</b></>} />
        <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b) => (
            <StaggerItem key={b.title}
              className="group grid content-start gap-3 rounded-[20px] border border-white/20 bg-white/10 p-6 backdrop-blur-sm transition-colors hover:bg-white/[.17]">
              <motion.span className={b.yellow ? 'icon3d-y' : 'icon3d'} whileHover={{ rotate: -8, scale: 1.08 }}
                transition={{ type: 'spring', stiffness: 300 }} aria-hidden="true">
                <Icon name={b.icon} className={`h-7 w-7 ${b.yellow ? 'text-brand-royal' : 'text-brand-blue'}`} />
              </motion.span>
              <h3 className="mt-1 text-lg font-extrabold">{b.title}</h3>
              <p className="text-[.94rem] text-white/85">{b.text}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
