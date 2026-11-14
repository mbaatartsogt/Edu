import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useUser } from '../../lib/user';
import { useCart } from '../../lib/cart';
import { Logo } from '../../components/ui/common';
import Icon, { Coin } from '../../components/ui/Icon';

const nf = (n) => new Intl.NumberFormat('en-US').format(n);

const menu = [
  { to: '/account', label: 'Хянах самбар', icon: 'home', end: true },
  { to: '/account/lessons', label: 'Видео хичээл', icon: 'video' },
  { to: '/account/programs', label: 'Хөтөлбөр сонгох', icon: 'book' },
  { to: '/account/cart', label: 'Сагс', icon: 'cart', badge: 'cart' },
  { to: '/account/orders', label: 'Миний захиалгууд', icon: 'card' },
  { to: '/account/points', label: 'MindPoint', icon: 'coin', badge: 'points' },
];

function Sidebar({ user, cartCount, onNavigate, onLogout }) {
  return (
    <div className="bg-grid-blue flex h-full flex-col text-white">
      <Link to="/" onClick={onNavigate} className="px-6 pb-5 pt-7" aria-label="Нүүр хуудас"><Logo /></Link>

      <div className="mx-4 mb-6 flex items-center gap-3 rounded-2xl bg-white/10 p-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-yellow text-lg font-black text-ink">{user.name.trim()[0]}</span>
        <div className="min-w-0">
          <p className="truncate font-bold">{user.name}</p>
          <p className="truncate text-xs text-white/75">{user.email || user.phone}</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3" aria-label="Миний булан цэс">
        <ul className="grid gap-1">
          {menu.map((it) => (
            <li key={it.to}>
              <NavLink to={it.to} end={it.end} onClick={onNavigate}
                className={({ isActive }) => `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition
                  ${isActive ? 'bg-white text-brand-navy shadow-lg shadow-brand-navy/25' : 'text-white/90 hover:bg-white/15'}`}>
                {({ isActive }) => (
                  <>
                    <span className={`grid h-8 w-8 place-items-center rounded-lg ${isActive ? 'bg-brand-blue text-white' : 'bg-white/15'}`}>
                      {it.icon === 'coin' ? <Coin className="h-6 w-6" /> : <Icon name={it.icon} className="h-[18px] w-[18px]" />}
                    </span>
                    <span className="flex-1">{it.label}</span>
                    {it.badge === 'cart' && cartCount > 0 && (
                      <motion.span key={cartCount} initial={{ scale: 1.6 }} animate={{ scale: 1 }}
                        className="rounded-full bg-brand-yellow px-2 py-0.5 text-[.72rem] font-black text-ink tabular-nums" aria-label={`Сагсанд ${cartCount}`}>{cartCount}</motion.span>
                    )}
                    {it.badge === 'points' && typeof user.points === 'number' && (
                      <span className={`rounded-full px-2 py-0.5 text-[.72rem] font-black tabular-nums ${isActive ? 'bg-brand-mist text-brand-royal' : 'bg-white/20'}`}>{nf(user.points)}</span>
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="grid gap-1 border-t border-white/15 p-3">
        <Link to="/" onClick={onNavigate} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/90 hover:bg-white/15">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/15"><Icon name="external" className="h-[18px] w-[18px]" /></span>Сайт руу буцах
        </Link>
        <button onClick={onLogout} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-white/90 hover:bg-white/15">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/15"><Icon name="logout" className="h-[18px] w-[18px]" /></span>Гарах
        </button>
      </div>
    </div>
  );
}

export default function AccountLayout() {
  const { user, ready, logout } = useUser();
  const { count } = useCart();
  const location = useLocation();
  const nav = useNavigate();
  const [drawer, setDrawer] = useState(false);
  const [toast, setToast] = useState(null);
  const timer = useRef();

  const flash = useCallback((msg, opts = {}) => {
    clearTimeout(timer.current);
    setToast({ msg, ...opts });
    timer.current = setTimeout(() => setToast(null), opts.action ? 4000 : 2600);
  }, []);

  useEffect(() => { setDrawer(false); }, [location.pathname]);
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e) => e.key === 'Escape' && setDrawer(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawer]);

  if (!ready) return <div className="grid min-h-screen place-items-center bg-brand-mist font-bold text-brand-blue">Ачаалж байна…</div>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;

  const doLogout = () => { logout(); nav('/', { replace: true }); };
  const current = menu.find((m) => (m.end ? location.pathname === m.to : location.pathname.startsWith(m.to)));

  return (
    <div className="min-h-screen bg-brand-mist lg:pl-72">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 lg:block">
        <Sidebar user={user} cartCount={count} onLogout={doLogout} />
      </aside>

      {/* Гар утас */}
      <header className="bg-grid-blue sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3 text-white lg:hidden">
        <button onClick={() => setDrawer(true)} aria-label="Цэс нээх" aria-expanded={drawer} className="grid h-10 w-10 place-items-center rounded-xl bg-white/15">
          <Icon name="menu" />
        </button>
        <span className="truncate font-extrabold">{current?.label ?? 'Миний булан'}</span>
        <Link to="/account/cart" aria-label={`Сагс, ${count} хөтөлбөр`} className="relative grid h-10 w-10 place-items-center rounded-xl bg-white/15">
          <Icon name="cart" />
          {count > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand-yellow px-1 text-[.68rem] font-black text-ink">{count}</span>}
        </Link>
      </header>
      <AnimatePresence>
        {drawer && (
          <div key="drawer" className="fixed inset-0 z-50 lg:hidden">
            <motion.div className="absolute inset-0 bg-black/50" onClick={() => setDrawer(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.aside className="absolute inset-y-0 left-0 w-[min(18rem,85vw)]" role="dialog" aria-modal="true" aria-label="Миний булан цэс"
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', stiffness: 320, damping: 34 }}>
              <Sidebar user={user} cartCount={count} onLogout={doLogout} onNavigate={() => setDrawer(false)} />
              <button onClick={() => setDrawer(false)} aria-label="Цэс хаах" className="absolute right-3 top-6 grid h-9 w-9 place-items-center rounded-xl bg-white/15 text-white">
                <Icon name="close" />
              </button>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8 md:py-10">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-4xl bg-white" />}>
          <Outlet context={{ flash }} />
        </Suspense>
      </main>

      <AnimatePresence>
        {toast && (
          <motion.div key="toast" role="status" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-full py-2.5 pl-5 pr-2.5 text-sm font-bold text-white shadow-xl lg:ml-36
              ${toast.type === 'error' ? 'bg-red-600' : 'bg-brand-navy'}`}>
            {toast.msg}
            {toast.action && <Link to={toast.action.to} onClick={() => setToast(null)} className="rounded-full bg-brand-yellow px-3 py-1.5 text-xs font-extrabold text-ink">{toast.action.label}</Link>}
            {!toast.action && <span className="w-2" />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
