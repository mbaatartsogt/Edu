export const ORDER_STATUS = {
  pending: { label: 'Төлбөр хүлээгдэж байна', short: 'Төлөөгүй', cls: 'bg-brand-yellow/25 text-[#8a6500]' },
  paid: { label: 'Төлөгдсөн', short: 'Төлөгдсөн', cls: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Цуцлагдсан', short: 'Цуцалсан', cls: 'bg-slate-200 text-slate-600' },
};

export const fmtDate = (iso) => new Date(iso).toLocaleString('mn-MN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

export function StatusPill({ status, short = false }) {
  const s = ORDER_STATUS[status] ?? ORDER_STATUS.pending;
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold ${s.cls}`}>{short ? s.short : s.label}</span>;
}
