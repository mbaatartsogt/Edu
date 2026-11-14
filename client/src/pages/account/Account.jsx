import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import { money, useUser } from '../../lib/user';
import { useCart } from '../../lib/cart';
import Icon, { Coin } from '../../components/ui/Icon';
import { OrderRow } from './Orders';

const nf = (n) => new Intl.NumberFormat('en-US').format(n);

/** Хянах самбар */
export default function Account() {
  const { user } = useUser();
  const { count } = useCart();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');

  const [lessons, setLessons] = useState(null);
  useEffect(() => { api.accountMe().then((d) => setOrders(d.orders)).catch((e) => setError(e.message)); }, []);
  useEffect(() => { api.lessons().then(setLessons).catch(() => {}); }, []);
  const watchable = lessons?.groups.flatMap((g) => g.lessons).filter((l) => l.canWatch && !l.isFree) ?? [];
  const watchedDone = watchable.filter((l) => l.completed).length;

  const pending = orders?.filter((o) => o.status === 'pending') ?? [];
  const paid = orders?.filter((o) => o.status === 'paid') ?? [];
  const enrolled = paid.reduce((s, o) => s + (o.items?.length || 1), 0);

  return (
    <div className="grid gap-8">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="grid gap-2">
        <span className="eyebrow">Хянах самбар</span>
        <h1 className="h2">Сайн байна уу, <b className="font-extrabold">{user.name}</b></h1>
      </motion.div>

      {error && <p role="alert" className="rounded-2xl bg-red-50 p-4 font-semibold text-red-700">{error}</p>}

      {pending.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border-2 border-brand-yellow bg-white p-5">
          <p className="font-bold">Танд төлөгдөөгүй {pending.length} захиалга байна ({money(pending.reduce((s, o) => s + o.amount, 0))}).</p>
          <Link to={`/account/orders/${pending[0].id}`} className="btn-yellow !px-5 !py-3 !text-xs">Төлбөр төлөх</Link>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Link to="/account/points" className="group relative overflow-hidden rounded-4xl bg-[radial-gradient(ellipse_at_20%_0%,#2C7BFF_0%,#0B3FB8_55%,#06123A_100%)] p-6 text-white transition hover:shadow-glow md:col-span-2">
          <span aria-hidden="true" className="absolute -right-10 -top-10 h-40 w-40 rounded-full border-[16px] border-brand-yellow/80" />
          <div className="relative flex flex-wrap items-center gap-5">
            <Coin className="h-14 w-14 drop-shadow-lg transition-transform group-hover:rotate-12" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-extrabold uppercase tracking-[.16em] text-white/75">Миний MindPoint</p>
              <p className="text-4xl font-black tabular-nums">{nf(user.points ?? 0)} <span className="text-lg font-bold text-white/80">оноо</span></p>
              <p className="text-sm text-white/85">Цуглуулсан оноогоороо бэлэг аваарай</p>
            </div>
            <span className="btn-yellow !px-5 !py-3 !text-xs">Бэлэг үзэх <Icon name="arrow" className="h-4 w-4" strokeWidth={3} /></span>
          </div>
        </Link>

        <Link to={count ? '/account/cart' : '/account/programs'} className="group grid content-between gap-4 rounded-4xl border border-line bg-white p-6 transition hover:border-brand-blue hover:shadow-card">
          <div className="flex items-center justify-between">
            <span className="icon3d !h-12 !w-12"><Icon name="cart" className="h-6 w-6 text-brand-blue" /></span>
            {count > 0 && <span className="rounded-full bg-brand-yellow px-3 py-1 text-sm font-black text-ink">{count}</span>}
          </div>
          <div>
            <p className="text-lg font-extrabold">{count ? `Сагсанд ${count} хөтөлбөр` : 'Сагс хоосон'}</p>
            <p className="flex items-center gap-1 text-sm font-bold text-brand-blue">{count ? 'Төлбөр төлөх' : 'Хөтөлбөр сонгох'} <Icon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={2.6} /></p>
          </div>
        </Link>
      </div>

      {watchable.length > 0 && (
        <Link to="/account/lessons" className="group flex flex-wrap items-center gap-5 rounded-4xl border border-line bg-white p-6 transition hover:border-brand-blue hover:shadow-card">
          <span className="icon3d !h-14 !w-14 shrink-0"><Icon name="video" className="h-7 w-7 text-brand-blue" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-extrabold">Видео хичээл · {watchable.length} хичээл нээлттэй</p>
            <p className="text-sm text-ink-soft">{watchedDone}/{watchable.length} хичээлийг үзэж дууссан</p>
            <div className="mt-2 h-2 max-w-sm overflow-hidden rounded-full bg-brand-mist">
              <div className="h-full rounded-full bg-gradient-to-r from-brand-sky to-brand-blue" style={{ width: `${Math.round((watchedDone / watchable.length) * 100)}%` }} />
            </div>
          </div>
          <span className="btn-blue !px-5 !py-3 !text-xs"><Icon name="play" className="h-4 w-4" /> Үзэх</span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          ['Бүртгэлтэй хөтөлбөр', enrolled],
          ['Төлсөн захиалга', paid.length],
          ['Төлөөгүй', pending.length],
          ['Нийт төлсөн', money(paid.reduce((s, o) => s + o.amount, 0))],
        ].map(([label, v]) => (
          <div key={label} className="rounded-3xl border border-line bg-white p-5">
            <p className="text-xs font-semibold text-ink-soft">{label}</p>
            <p className="mt-1 text-2xl font-black tabular-nums">{orders ? v : '…'}</p>
          </div>
        ))}
      </div>

      <section className="grid gap-4" aria-labelledby="recent-title">
        <div className="flex items-end justify-between gap-3">
          <h2 id="recent-title" className="text-2xl font-extrabold">Сүүлийн захиалгууд</h2>
          {orders?.length > 3 && <Link to="/account/orders" className="text-sm font-bold text-brand-blue hover:underline">Бүгдийг харах</Link>}
        </div>
        {!orders ? <div className="h-32 animate-pulse rounded-3xl bg-white" /> : !orders.length ? (
          <div className="grid justify-items-center gap-3 rounded-3xl border border-dashed border-line bg-white px-6 py-12 text-center">
            <p className="font-extrabold">Одоогоор захиалга алга</p>
            <Link to="/account/programs" className="btn-blue !py-3">Хөтөлбөр сонгох</Link>
          </div>
        ) : (
          <ul className="grid gap-3">{orders.slice(0, 3).map((o) => <OrderRow key={o.id} o={o} />)}</ul>
        )}
      </section>
    </div>
  );
}
