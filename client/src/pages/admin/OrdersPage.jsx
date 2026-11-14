import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../../lib/api';
import { money } from '../../lib/user';
import Icon from '../../components/ui/Icon';
import { ORDER_STATUS, StatusPill, fmtDate } from '../account/shared';
import { orderItems } from '../account/Orders';

const fmtPhone = (p) => (p ? `${p.slice(0, 4)} ${p.slice(4)}` : '—');

function toCSV(rows) {
  const head = ['Дугаар', 'Огноо', 'Эцэг эх', 'Утас', 'Хүүхэд', 'Нас', 'Хөтөлбөр', 'Салбар', 'Дүн', 'Төлөв', 'Төлсөн огноо'];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = rows.flatMap((o) => orderItems(o).map((it) => [o.orderNo, fmtDate(o.createdAt), o.parentName, o.parentPhone, it.childName, it.childAge,
    `${it.programTitle}${it.programAge ? ` (${it.programAge})` : ''}`, it.branchName, it.amount, ORDER_STATUS[o.status]?.short, o.paidAt ? fmtDate(o.paidAt) : ''].map(esc).join(',')));
  return '﻿' + [head.map(esc).join(','), ...lines].join('\n');
}

function Stat({ label, value, accent, i }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
      className="relative overflow-hidden rounded-3xl border border-line bg-white p-5">
      <span className={`absolute -right-5 -top-5 h-16 w-16 rounded-full ${accent}`} aria-hidden="true" />
      <p className="text-sm font-semibold text-ink-soft">{label}</p>
      <p className="mt-1 text-3xl font-black tabular-nums">{value}</p>
    </motion.div>
  );
}

export default function OrdersPage() {
  const { flash } = useOutletContext();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [confirm, setConfirm] = useState(null); // { id, status }

  const load = () => api.adminOrders().then(setData)
    .catch((err) => (err.status === 401 ? nav('/admin/login', { replace: true }) : setError(err.message)));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function setStatus(id, status) {
    setConfirm(null);
    try {
      const updated = await api.updateOrder(id, { status });
      setData((d) => ({ ...d, orders: d.orders.map((o) => (o.id === id ? { ...o, ...updated } : o)) }));
      flash(status === 'paid' ? 'Төлөгдсөн болголоо' : status === 'cancelled' ? 'Цуцаллаа' : 'Шинэчиллээ');
      api.adminOrders().then((d) => setData((cur) => ({ ...cur, stats: d.stats })));
    } catch (err) { flash(err.message, 'error'); }
  }

  const shown = useMemo(() => {
    if (!data) return [];
    const term = q.trim().toLowerCase();
    const digits = term.replace(/\D/g, '');
    return data.orders.filter((o) => (filter === 'all' || o.status === filter) &&
      (!term || [o.parentName, o.childName, o.orderNo, o.programTitle].some((v) => String(v).toLowerCase().includes(term)) || (digits && String(o.parentPhone ?? '').includes(digits))));
  }, [data, filter, q]);

  function exportCSV() {
    const blob = new Blob([toCSV(shown)], { type: 'text/csv;charset=utf-8' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `mindedu-zahialga-${new Date().toISOString().slice(0, 10)}.csv` });
    a.click(); URL.revokeObjectURL(a.href);
  }

  if (error) return <p role="alert" className="rounded-2xl bg-red-50 p-4 font-semibold text-red-700">{error}</p>;
  if (!data) return <div className="h-96 animate-pulse rounded-3xl bg-white" />;
  const { stats } = data;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Захиалга, төлбөр</h1>
          <p className="text-ink-soft">Эцэг эхчүүд нэвтэрч хөтөлбөр сонгон QPay-аар төлсөн захиалгууд.</p>
        </div>
        <button onClick={exportCSV} disabled={!shown.length} className="flex items-center gap-2 rounded-full bg-brand-blue px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-royal disabled:opacity-50">
          <Icon name="download" className="h-4 w-4" /> CSV татах</button>
      </div>

      {data.paymentMode === 'demo' && (
        <p className="rounded-2xl border-2 border-dashed border-brand-yellow bg-white px-5 py-4 text-sm">
          <b>Туршилтын горим идэвхтэй.</b> Жинхэнэ төлбөр авахын тулд <code className="rounded bg-brand-mist px-1.5">server/.env</code> файлд QPay-ийн мэдээллээ оруулж <code className="rounded bg-brand-mist px-1.5">QPAY_MODE=live</code> болгоно уу.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat i={0} label="Энэ сарын орлого" value={money(stats.paidThisMonth)} accent="bg-emerald-300/50" />
        <Stat i={1} label="Нийт орлого" value={money(stats.paidTotal)} accent="bg-brand-sky/40" />
        <Stat i={2} label="Төлөгдөөгүй захиалга" value={stats.pendingCount} accent="bg-brand-yellow/60" />
        <Stat i={3} label="Бүртгэлтэй эцэг эх" value={stats.userCount} accent="bg-brand-blue/30" />
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="relative min-w-0 flex-1 basis-60">
          <span className="sr-only">Хайх</span>
          <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <input id="order-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Нэр, утас, захиалгын дугаараар хайх"
            className="w-full rounded-full border border-line bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-brand-blue" />
        </label>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Төлөвөөр шүүх">
          {[['all', 'Бүгд'], ['paid', 'Төлөгдсөн'], ['pending', 'Төлөөгүй'], ['cancelled', 'Цуцалсан']].map(([k, label]) => (
            <button key={k} role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}
              className={`rounded-full px-4 py-2.5 text-sm font-bold transition ${filter === k ? 'bg-brand-navy text-white' : 'border border-line bg-white hover:border-brand-blue'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {!shown.length ? (
        <div className="grid justify-items-center gap-2 rounded-3xl border border-dashed border-line bg-white px-6 py-14 text-center">
          <Icon name="card" className="h-8 w-8 text-brand-sky" />
          <p className="font-extrabold">{data.orders.length ? 'Шүүлтэд тохирох захиалга алга' : 'Одоогоор захиалга ороогүй байна'}</p>
          <p className="text-sm text-ink-soft">Хөтөлбөрүүдэд үнэ тохируулсны дараа эцэг эхчүүд сайтаас захиалж эхэлнэ.</p>
        </div>
      ) : (
        <ul className="grid gap-3">
          <AnimatePresence initial={false}>
            {shown.map((o) => (
              <motion.li key={o.id} layout className="grid gap-3 rounded-3xl border border-line bg-white p-5 md:grid-cols-[minmax(0,1.3fr)_minmax(0,.8fr)_minmax(0,1.3fr)] md:items-center">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-ink-soft tabular-nums">{o.orderNo} · {fmtDate(o.createdAt)}{orderItems(o).length > 1 ? ` · ${orderItems(o).length} хөтөлбөр` : ''}</p>
                  <ul className="mt-1 grid gap-0.5">
                    {orderItems(o).map((it, i) => (
                      <li key={i} className="text-sm">
                        <b className="font-extrabold">{it.childName}</b> <span className="text-ink-soft">({it.childAge})</span> — {it.programTitle}
                        <span className="text-ink-soft">{it.branchName ? ` · ${it.branchName}` : ''}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="text-sm">
                  <p className="font-bold">{o.parentName}</p>
                  {o.parentPhone ? <a href={`tel:${o.parentPhone}`} className="font-semibold text-brand-blue tabular-nums">{fmtPhone(o.parentPhone)}</a> : <span className="text-ink-soft">утасгүй</span>}
                </div>
                <div className="flex flex-wrap items-center gap-3 md:justify-end">
                  <p className="text-lg font-black tabular-nums">{money(o.amount)}</p>
                  <StatusPill status={o.status} short />
                  {confirm?.id === o.id ? (
                    <span className="flex gap-1.5">
                      <button onClick={() => setStatus(o.id, confirm.status)} className={`rounded-full px-3 py-1.5 text-xs font-bold text-white ${confirm.status === 'cancelled' ? 'bg-red-600' : 'bg-emerald-600'}`}>
                        {confirm.status === 'paid' ? 'Тийм, төлсөн' : confirm.status === 'cancelled' ? 'Тийм, цуцлах' : 'Тийм'}
                      </button>
                      <button onClick={() => setConfirm(null)} className="rounded-full border border-line px-3 py-1.5 text-xs font-bold">Болих</button>
                    </span>
                  ) : o.status === 'pending' ? (
                    <span className="flex gap-1.5">
                      <button onClick={() => setConfirm({ id: o.id, status: 'paid' })} title="Бэлэн мөнгө, дансаар төлсөн үед"
                        className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100">Төлсөн болгох</button>
                      <button onClick={() => setConfirm({ id: o.id, status: 'cancelled' })} className="rounded-full border border-line px-3 py-1.5 text-xs font-bold hover:border-red-300 hover:text-red-600">Цуцлах</button>
                    </span>
                  ) : o.status === 'cancelled' ? (
                    <button onClick={() => setConfirm({ id: o.id, status: 'pending' })} className="rounded-full border border-line px-3 py-1.5 text-xs font-bold">Сэргээх</button>
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
