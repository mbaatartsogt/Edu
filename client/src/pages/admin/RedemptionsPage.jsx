import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../../lib/api';
import Icon, { Coin } from '../../components/ui/Icon';
import { fmtDate } from '../account/shared';

const STATUS = {
  pending: { label: 'Олгоогүй', cls: 'bg-brand-yellow/25 text-[#8a6500]' },
  fulfilled: { label: 'Олгосон', cls: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Цуцалсан', cls: 'bg-slate-200 text-slate-600' },
};
const nf = (n) => new Intl.NumberFormat('en-US').format(n);

export default function RedemptionsPage() {
  const { flash, refreshCount } = useOutletContext();
  const nav = useNavigate();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('pending');
  const [q, setQ] = useState('');
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    api.redemptions().then(setItems).catch((err) => (err.status === 401 ? nav('/admin/login', { replace: true }) : setError(err.message)));
  }, [nav]);

  async function setStatus(id, status) {
    setConfirm(null);
    try {
      const row = await api.updateRedemption(id, { status });
      setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...row } : x)));
      refreshCount();
      flash(status === 'fulfilled' ? 'Олгосон гэж тэмдэглэлээ' : 'Цуцалж, оноог буцаалаа');
    } catch (err) { flash(err.message, 'error'); }
  }

  const shown = useMemo(() => {
    if (!items) return [];
    const t = q.trim().toLowerCase();
    return items.filter((r) => (filter === 'all' || r.status === filter) &&
      (!t || [r.code, r.userName, r.userEmail, r.userPhone, r.rewardTitle].some((v) => String(v).toLowerCase().includes(t))));
  }, [items, filter, q]);

  if (error) return <p role="alert" className="rounded-2xl bg-red-50 p-4 font-semibold text-red-700">{error}</p>;
  if (!items) return <div className="h-96 animate-pulse rounded-3xl bg-white" />;

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-extrabold">Бэлэг олголт</h1>
        <p className="text-ink-soft">Эцэг эхчүүд оноогоороо авсан бэлгүүд. Салбарт ирж кодоо үзүүлэхэд нь бэлгийг өгөөд “Олгосон” гэж тэмдэглэнэ.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="relative min-w-0 flex-1 basis-60">
          <span className="sr-only">Код эсвэл нэрээр хайх</span>
          <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <input id="rd-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Код (MP-…), нэр, утсаар хайх"
            className="w-full rounded-full border border-line bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-brand-blue" />
        </label>
        <div className="flex flex-wrap gap-2" role="tablist">
          {[['pending', 'Олгоогүй'], ['fulfilled', 'Олгосон'], ['cancelled', 'Цуцалсан'], ['all', 'Бүгд']].map(([k, label]) => (
            <button key={k} role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}
              className={`rounded-full px-4 py-2.5 text-sm font-bold transition ${filter === k ? 'bg-brand-navy text-white' : 'border border-line bg-white hover:border-brand-blue'}`}>
              {label} <span className="ml-1 opacity-60 tabular-nums">{k === 'all' ? items.length : items.filter((r) => r.status === k).length}</span>
            </button>
          ))}
        </div>
      </div>

      {!shown.length ? (
        <div className="grid justify-items-center gap-2 rounded-3xl border border-dashed border-line bg-white px-6 py-14 text-center">
          <Icon name="gift" className="h-8 w-8 text-brand-sky" />
          <p className="font-extrabold">Энд харуулах бэлэг алга</p>
        </div>
      ) : (
        <ul className="grid gap-3">
          <AnimatePresence initial={false}>
            {shown.map((r) => (
              <motion.li key={r.id} layout className="grid gap-3 rounded-3xl border border-line bg-white p-5 md:grid-cols-[auto_minmax(0,1.3fr)_minmax(0,1fr)_auto] md:items-center">
                <span className="w-fit rounded-xl bg-brand-mist px-3 py-2 font-mono text-lg font-black tracking-widest text-brand-royal">{r.code}</span>
                <div className="min-w-0">
                  <p className="font-extrabold">{r.rewardTitle}</p>
                  <p className="flex items-center gap-1.5 text-sm text-ink-soft"><Coin className="h-4 w-4" /> {nf(r.points)} оноо · {fmtDate(r.createdAt)}</p>
                </div>
                <div className="min-w-0 text-sm">
                  <p className="font-bold">{r.userName}</p>
                  <p className="truncate text-ink-soft">{[r.userPhone, r.userEmail].filter(Boolean).join(' · ')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${STATUS[r.status].cls}`}>{STATUS[r.status].label}</span>
                  {confirm?.id === r.id ? (
                    <>
                      <button onClick={() => setStatus(r.id, confirm.status)} className={`rounded-full px-3 py-1.5 text-xs font-bold text-white ${confirm.status === 'cancelled' ? 'bg-red-600' : 'bg-emerald-600'}`}>
                        {confirm.status === 'cancelled' ? 'Тийм, цуцлах' : 'Тийм, олгосон'}</button>
                      <button onClick={() => setConfirm(null)} className="rounded-full border border-line px-3 py-1.5 text-xs font-bold">Болих</button>
                    </>
                  ) : r.status === 'pending' ? (
                    <>
                      <button onClick={() => setConfirm({ id: r.id, status: 'fulfilled' })} className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100">Олгосон</button>
                      <button onClick={() => setConfirm({ id: r.id, status: 'cancelled' })} title="Оноог буцааж өгнө" className="rounded-full border border-line px-3 py-1.5 text-xs font-bold hover:text-red-600">Цуцлах</button>
                    </>
                  ) : null}
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
