import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { money } from '../../lib/user';
import Icon from '../../components/ui/Icon';
import { StatusPill, fmtDate } from './shared';

/** Захиалгын хөтөлбөрүүд (хуучин захиалгад items байхгүй бол үндсэн талбараас) */
export const orderItems = (o) => (o.items?.length ? o.items : [{ programTitle: o.programTitle, programAge: o.programAge, childName: o.childName, childAge: o.childAge, branchName: o.branchName, amount: o.amount }]);

export function OrderRow({ o }) {
  const items = orderItems(o);
  return (
    <li>
      <Link to={`/account/orders/${o.id}`}
        className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-3xl border border-line bg-white p-5 transition hover:border-brand-blue hover:shadow-card">
        <div className="min-w-0 flex-1 basis-64">
          <p className="text-xs font-bold text-ink-soft tabular-nums">{o.orderNo} · {fmtDate(o.createdAt)}</p>
          <ul className="mt-1 grid gap-0.5">
            {items.map((it, i) => (
              <li key={i} className="truncate">
                <b className="font-extrabold">{it.programTitle}</b>
                <span className="text-sm text-ink-soft"> · {it.childName}, {it.childAge} нас{it.branchName ? ` · ${it.branchName}` : ''}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xl font-black tabular-nums">{money(o.amount)}</p>
        <StatusPill status={o.status} short />
        <Icon name="arrow" className="h-5 w-5 text-ink-soft" />
      </Link>
    </li>
  );
}

export default function Orders() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  useEffect(() => { api.accountMe().then((d) => setOrders(d.orders)).catch((e) => setError(e.message)); }, []);

  const shown = orders?.filter((o) => filter === 'all' || o.status === filter) ?? [];

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <span className="eyebrow">Захиалгууд</span>
        <h1 className="h2">Миний <b className="font-extrabold">захиалгууд</b></h1>
      </div>
      <div className="flex flex-wrap gap-2" role="tablist">
        {[['all', 'Бүгд'], ['paid', 'Төлөгдсөн'], ['pending', 'Төлөөгүй'], ['cancelled', 'Цуцалсан']].map(([k, label]) => (
          <button key={k} role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}
            className={`rounded-full px-4 py-2.5 text-sm font-bold transition ${filter === k ? 'bg-brand-navy text-white' : 'border border-line bg-white hover:border-brand-blue'}`}>{label}</button>
        ))}
      </div>
      {error && <p role="alert" className="rounded-2xl bg-red-50 p-4 font-semibold text-red-700">{error}</p>}
      {!orders ? <div className="h-40 animate-pulse rounded-3xl bg-white" /> : !shown.length ? (
        <div className="grid justify-items-center gap-3 rounded-3xl border border-dashed border-line bg-white px-6 py-12 text-center">
          <p className="font-extrabold">{orders.length ? 'Энэ төлөвт захиалга алга' : 'Одоогоор захиалга алга'}</p>
          <Link to="/account/programs" className="btn-blue !py-3">Хөтөлбөр сонгох</Link>
        </div>
      ) : (
        <ul className="grid gap-3">{shown.map((o) => <OrderRow key={o.id} o={o} />)}</ul>
      )}
    </div>
  );
}
