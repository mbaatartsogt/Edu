import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { Link } from 'react-router-dom';
import { nav } from '../../data/content';
import { useUser } from '../../lib/user';
import { useCart } from '../../lib/cart';
import { ChristmasLights, useSeason } from '../effects/Season';
import { Logo } from '../ui/common';
import Icon from '../ui/Icon';

export default function Header() {
  const { user } = useUser();
  const { count } = useCart();
  const season = useSeason();
  const account = user ? { to: '/account', label: 'Миний булан' } : { to: '/login', label: 'Нэвтрэх' };
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState('');
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, 'change', (y) => setScrolled(y > 24));

  // Одоо харагдаж буй хэсгийг цэсэнд тодруулах
  useEffect(() => {
    const ids = nav.map((n) => n.href.slice(1));
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive('#' + e.target.id)),
      { rootMargin: '-45% 0px -50% 0px' },
    );
    ids.forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);

  return (
    <header
      className={`sticky z-50 text-white transition-all duration-300 ${scrolled ? 'bg-brand-blue/90 shadow-lg shadow-brand-navy/20 backdrop-blur-md' : 'bg-brand-blue'}`}
      style={{ top: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className={`wrap flex items-center justify-between gap-5 transition-all duration-300 ${scrolled ? 'py-2.5' : 'py-4'}`}>
        <a href="#top" aria-label="MindEdu — нүүр хуудас"><Logo /></a>

        <nav className="hidden items-center gap-7 text-[.92rem] font-semibold lg:flex" aria-label="Үндсэн цэс">
          {nav.map((n) => (
            <a key={n.href} href={n.href} className="group relative py-1 opacity-90 hover:opacity-100">
              {n.label}
              <span className={`absolute inset-x-0 -bottom-1 h-[3px] origin-left rounded bg-brand-yellow transition-transform duration-300 ${active === n.href ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`} />
            </a>
          ))}
        </nav>

        <Link to="/account/cart" aria-label={`Сагс, ${count} хөтөлбөр`} className="relative ml-auto grid h-11 w-11 place-items-center rounded-2xl bg-white/15 transition hover:bg-white/25 lg:ml-0">
          <Icon name="cart" className="h-6 w-6" />
          <AnimatePresence>
            {count > 0 && (
              <motion.span key={count} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                className="absolute -right-1.5 -top-1.5 grid h-6 min-w-6 place-items-center rounded-full bg-brand-yellow px-1 text-xs font-black text-ink">{count}</motion.span>
            )}
          </AnimatePresence>
        </Link>
        <Link to={account.to} className="btn-yellow hidden !px-5 !py-3 !text-xs lg:inline-flex">
          <Icon name={user ? 'user' : 'login'} className="h-4 w-4" strokeWidth={2.6} />{account.label}
        </Link>

        <button
          className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15 lg:hidden"
          aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? 'Цэс хаах' : 'Цэс нээх'}
          onClick={() => setOpen((o) => !o)}
        >
          <Icon name={open ? 'close' : 'menu'} className="h-6 w-6" strokeWidth={2.4} />
        </button>
      </div>

      {season === 'christmas' && <ChristmasLights />}
      <AnimatePresence>
        {open && (
          <motion.nav
            key="mobile-nav" id="mobile-nav" aria-label="Гар утасны цэс"
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }} className="overflow-hidden lg:hidden"
          >
            <div className="wrap grid gap-1 pb-5">
              {nav.map((n, i) => (
                <motion.a key={n.href} href={n.href} onClick={() => setOpen(false)}
                  initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.04 * i }}
                  className="border-t border-white/15 px-1 py-3 font-semibold">
                  {n.label}
                </motion.a>
              ))}
              <Link to={account.to} onClick={() => setOpen(false)} className="btn-yellow mt-3">{account.label}</Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
