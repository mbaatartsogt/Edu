import { useEffect } from 'react';
import { animate, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';

/**
 * Курсорын байрлалыг өгөгдсөн цэгээс (anchor элементийн төв) хэр зайтай байгааг −1…1 хооронд буцаана.
 * Хулгана 2.5 секунд хөдлөхгүй эсвэл мэдрэгчтэй дэлгэц бол аажуухан эргэн тойрноо "харна".
 */
export function useCursor(anchorRef, { range = 520 } = {}) {
  const reduce = useReducedMotion();
  const rawX = useMotionValue(0), rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 120, damping: 16, mass: 0.6 });
  const y = useSpring(rawY, { stiffness: 120, damping: 16, mass: 0.6 });
  const near = useMotionValue(0); // 0..1 — курсор дүрд хэр ойр байна

  useEffect(() => {
    if (reduce) return undefined;
    let idleTimer, idleAnim = [], lastMove = 0;
    const stopIdle = () => { idleAnim.forEach((a) => a.stop()); idleAnim = []; };
    const startIdle = () => {
      stopIdle();
      const loop = () => {
        const tx = (Math.random() * 2 - 1) * 0.8, ty = (Math.random() * 2 - 1) * 0.5;
        idleAnim = [
          animate(rawX, tx, { duration: 1.4, ease: 'easeInOut' }),
          animate(rawY, ty, { duration: 1.4, ease: 'easeInOut', onComplete: () => { idleTimer = setTimeout(loop, 900 + Math.random() * 1600); } }),
        ];
      };
      loop();
    };
    const onMove = (e) => {
      const el = anchorRef.current;
      if (!el) return;
      const b = el.getBoundingClientRect();
      const cx = b.left + b.width / 2, cy = b.top + b.height * 0.32;
      const dx = e.clientX - cx, dy = e.clientY - cy;
      rawX.set(Math.max(-1, Math.min(1, dx / range)));
      rawY.set(Math.max(-1, Math.min(1, dy / (range * 0.7))));
      near.set(Math.max(0, 1 - Math.hypot(dx, dy) / (range * 0.6)));
      lastMove = Date.now();
      stopIdle(); clearTimeout(idleTimer);
      idleTimer = setTimeout(() => { if (Date.now() - lastMove >= 2400) { near.set(0); startIdle(); } }, 2500);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    // Хулганагүй төхөөрөмж дээр шууд эргэн тойрноо харж эхэлнэ
    if (!window.matchMedia('(hover: hover)').matches) startIdle();
    return () => { window.removeEventListener('pointermove', onMove); stopIdle(); clearTimeout(idleTimer); };
  }, [anchorRef, range, reduce, rawX, rawY, near]);

  return { x, y, near };
}

/** Улаанбаатарын цаг (HH:MM) */
export function ubTime() {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ulaanbaatar', hour: '2-digit', minute: '2-digit' }).format(new Date());
}
