import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { api, auth } from '../../lib/api';
import { Logo } from '../../components/ui/common';
import Icon from '../../components/ui/Icon';

const menu = [
  { group: 'Үндсэн', items: [
    { to: '/admin', label: 'Хянах самбар', icon: 'chart', end: true },
    { to: '/admin/orders', label: 'Захиалга, төлбөр', icon: 'inbox' },
    { to: '/admin/students', label: 'Хөтөлбөр, сурагчид', icon: 'users' },
    { to: '/admin/chats', label: 'Чат мессежүүд', icon: 'messenger', badge: 'chats' },
    { to: '/admin/users', label: 'Хэрэглэгчид, оноо', icon: 'user' },
  ] },
  { group: 'MindPoint', items: [
    { to: '/admin/redemptions', label: 'Бэлэг олголт', icon: 'gift', badge: 'redemptions' },
    { to: '/admin/rewards', label: 'Бэлэгнүүд', icon: 'card' },
  ] },
  { group: 'Сайтын контент', items: [
    { to: '/admin/programs', label: 'Хөтөлбөрүүд', icon: 'book' },
    { to: '/admin/lessons', label: 'Видео хичээлүүд', icon: 'video' },
    { to: '/admin/teachers', label: 'Багш нар', icon: 'cap' },
    { to: '/admin/branches', label: 'Салбарууд', icon: 'pin' },
    { to: '/admin/faqs', label: 'Чат-ботын хариултууд', icon: 'chat' },
  ] },
  { group: 'Тохиргоо', items: [
    { to: '/admin/settings', label: 'Холбоос, холбоо барих', icon: 'link' },
    { to: '/admin/requests', label: 'Хуучин хүсэлтүүд', icon: 'inbox', badge: 'enroll' },
  ] },
];

function Sidebar({ newCount, onNavigate, onLogout }) {
  return (
    <div className="flex h-full flex-col bg-brand-navy text-white">
      <div className="flex items-center gap-3 px-6 pb-6 pt-7">
        <Logo />
      </div>
      <span className="mx-6 mb-6 w-fit rounded-full bg-brand-yellow px-2.5 py-1 text-[.65rem] font-extrabold tracking-[.14em] text-ink">ADMIN PANEL</span>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3" aria-label="Админ цэс">
        {menu.map((g) => (
          <div key={g.group}>
            <p className="mb-2 px-3 text-[.68rem] font-extrabold uppercase tracking-[.16em] text-white/45">{g.group}</p>
            <ul className="grid gap-1">
              {g.items.map((it) => (
                <li key={it.to}>
                  <NavLink to={it.to} end={it.end} onClick={onNavigate}
                    className={({ isActive }) => `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition
                      ${isActive ? 'bg-white text-brand-navy shadow-lg shadow-black/20' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}>
                    {({ isActive }) => (
                      <>
                        <span className={`grid h-8 w-8 place-items-center rounded-lg transition ${isActive ? 'bg-brand-blue text-white' : 'bg-white/10 group-hover:bg-white/15'}`}>
                          <Icon name={it.icon} className="h-[18px] w-[18px]" />
                        </span>
                        <span className="flex-1">{it.label}</span>
                        {it.badge && newCount[it.badge] > 0 && (
                          <span className="rounded-full bg-brand-yellow px-2 py-0.5 text-[.7rem] font-extrabold text-ink tabular-nums"
                            aria-label={`${newCount[it.badge]} шинэ`}>{newCount[it.badge]}</span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="grid gap-1 border-t border-white/10 p-3">
        <Link to="/" target="_blank" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10"><Icon name="external" className="h-[18px] w-[18px]" /></span>
          Сайт харах
        </Link>
        <button onClick={onLogout} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10"><Icon name="logout" className="h-[18px] w-[18px]" /></span>
          Гарах
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const nav = useNavigate();
  const location = useLocation();
  const [toast, setToast] = useState(null);
  const [drawer, setDrawer] = useState(false);
  const [newCount, setNewCount] = useState({ enroll: 0, chats: 0, redemptions: 0 });
  const timer = useRef();

  useEffect(() => {
    if (!auth.token) nav('/admin/login', { replace: true });
  }, [nav]);

  // Шинэ бүртгэлийн тоог хуудас солих бүрд шинэчилнэ
  const refreshCount = useCallback(() => {
    api.stats().then((s) => setNewCount({ enroll: s.byStatus?.new ?? 0, chats: s.chatsNew ?? 0, redemptions: s.redemptionsPending ?? 0 })).catch(() => {});
  }, []);
  useEffect(() => { if (auth.token) refreshCount(); }, [location.pathname, refreshCount]);

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e) => e.key === 'Escape' && setDrawer(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawer]);

  const flash = useCallback((msg, type = 'ok') => {
    clearTimeout(timer.current);
    setToast({ msg, type });
    timer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const logout = () => { auth.clear(); nav('/admin/login', { replace: true }); };

  if (!auth.token) return null;

  const current = menu.flatMap((g) => g.items).find((it) => (it.end ? location.pathname === it.to : location.pathname.startsWith(it.to)));

  return (
    <div className="min-h-screen bg-brand-mist lg:pl-72">
      {/* Desktop: тогтмол хажуугийн цэс */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 lg:block">
        <Sidebar newCount={newCount} onLogout={logout} />
      </aside>

      {/* Гар утас: дээд мөр + гулсдаг цэс */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-brand-navy px-4 py-3 text-white lg:hidden">
        <button onClick={() => setDrawer(true)} aria-label="Цэс нээх" aria-expanded={drawer}
          className="grid h-10 w-10 place-items-center rounded-xl bg-white/10"><Icon name="menu" /></button>
        <span className="truncate font-extrabold">{current?.label ?? 'Админ'}</span>
        <Logo compact className="scale-75" />
      </header>
      <AnimatePresence>
        {drawer && (
          <div key="drawer" className="fixed inset-0 z-50 lg:hidden">
            <motion.div className="absolute inset-0 bg-black/50" onClick={() => setDrawer(false)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.aside className="absolute inset-y-0 left-0 w-[min(18rem,85vw)]" role="dialog" aria-modal="true" aria-label="Админ цэс"
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', stiffness: 320, damping: 34 }}>
              <Sidebar newCount={newCount} onLogout={logout} onNavigate={() => setDrawer(false)} />
              <button onClick={() => setDrawer(false)} aria-label="Цэс хаах"
                className="absolute right-3 top-6 grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-white"><Icon name="close" /></button>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        {/* Хуудас ачаалах үед хажуугийн цэс хэвээр үлдэнэ */}
        <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-white" />}>
          <Outlet context={{ flash, refreshCount }} />
        </Suspense>
      </main>

      <AnimatePresence>
        {toast && (
          <motion.div key="toast" role="status" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full px-5 py-3 text-sm font-bold text-white shadow-xl lg:ml-36
              ${toast.type === 'error' ? 'bg-red-600' : 'bg-brand-navy'}`}>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
