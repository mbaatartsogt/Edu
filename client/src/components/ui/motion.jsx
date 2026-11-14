import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion, useScroll, useSpring, animate } from 'framer-motion';

const ease = [0.22, 1, 0.36, 1];

/** Scroll хийхэд доороос гарч ирэх анимэйшн */
export function Reveal({ children, delay = 0, y = 32, className = '', as = 'div', ...rest }) {
  const reduce = useReducedMotion();
  const Comp = motion[as];
  return (
    <Comp
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -80px 0px' }}
      transition={{ duration: 0.7, ease, delay }}
      {...rest}
    >
      {children}
    </Comp>
  );
}

/** Хүүхдүүдийг дараалуулан гаргах (stagger) */
export const staggerParent = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};
export const staggerChild = {
  hidden: { opacity: 0, y: 36, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.65, ease } },
};

export function Stagger({ children, className = '', as = 'div' }) {
  const reduce = useReducedMotion();
  const Comp = motion[as];
  return (
    <Comp
      className={className}
      variants={staggerParent}
      initial={reduce ? false : 'hidden'}
      whileInView="show"
      viewport={{ once: true, margin: '0px 0px -60px 0px' }}
    >
      {children}
    </Comp>
  );
}

export function StaggerItem({ children, className = '', as = 'div', ...rest }) {
  const Comp = motion[as];
  return <Comp className={className} variants={staggerChild} {...rest}>{children}</Comp>;
}

/** Тоо 0-оос тоолж өсөх */
export function Counter({ to, suffix = '', duration = 1.4 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [val, setVal] = useState(reduce ? to : 0);
  useEffect(() => {
    if (!inView || reduce) return;
    const c = animate(0, to, { duration, ease, onUpdate: (v) => setVal(Math.round(v)) });
    return () => c.stop();
  }, [inView, to, duration, reduce]);
  return <span ref={ref} className="tabular-nums">{val}{suffix}</span>;
}

/** Хуудасны дээд талд scroll-ын явцыг харуулах шар зураас */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 25, mass: 0.3 });
  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-[70] h-1 origin-left bg-brand-yellow"
    />
  );
}
