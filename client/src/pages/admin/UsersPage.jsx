import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../../lib/api';
import Icon, { Coin } from '../../components/ui/Icon';
import { fmtDate } from '../account/shared';

const nf = (n) => new Intl.NumberFormat('en-US').format(n);
const TX_LABEL = { signup: 'Бүртгэлийн урамшуулал', earn_order: 'Төлбөрийн оноо', earn_reversal: 'Төлбөр буцаалт', redeem: 'Бэлэг авсан', refund: 'Оноо буцаалт', admin: 'Админ' };

function PointsPanel({ user, onClose, onChanged }) {
  const { flash } = useOutletContext();
  const [hist, setHist] = useState(null);
  const [form, setForm] = useState({ sign: '+', amount: '', reason: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const load = () => api.userPoints(user.id).then((d) => setHist(d.history)).catch(() => setHist([]));
  useEffect(() => { load(); }, [user.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit(e) {
    e.preventDefault();
    const n = parseInt(form.amount, 10);
    const errs = {};
    if (!n || n <= 0) errs.amount = 'Эерэг бүхэл тоо оруулна уу.';
    if (!form.reason.trim()) errs.reason = 'Шалтгаанаа бичнэ үү.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const { balance } = await api.adjustPoints(user.id, form.sign === '+' ? n : -n, form.reason.trim());
      onChanged(user.id, balance);
      setForm({ sign: '+', amount: '', reason: '' });
      flash(`${form.sign}${n} оноо. Үлдэгдэл: ${nf(balance)}`);
      load();
    } catch (err) {
      if (err.body?.errors) setErrors(err.body.errors); else flash(err.message, 'error');
    } finally { setBusy(false); }
  }

  const inputCls = 'w-full rounded-xl border-2 border-transparent bg-brand-mist px-3.5 py-2.5 font-medium outline-none focus:border-brand-blue focus:bg-white';
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <motion.div className="absolute inset-0 bg-brand-navy/40 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.aside role="dialog" aria-modal="true" aria-labelledby="pp-title" className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 34 }}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <h2 id="pp-title" className="text-xl font-extrabold">{user.name}</h2>
            <p className="text-sm text-ink-soft">{user.email || user.phone}</p>
          </div>
          <button onClick={onClose} aria-label="Хаах" className="rounded-xl p-2 hover:bg-brand-mist"><Icon name="close" /></button>
        </div>
        <div className="grid flex-1 content-start gap-6 overflow-y-auto p-6">
          <div className="flex items-center gap-3 rounded-3xl bg-brand-mist p-5">
            <Coin className="h-12 w-12" />
            <div><p className="text-xs font-bold uppercase tracking-wider text-ink-soft">Үлдэгдэл</p><p className="text-3xl font-black tabular-nums">{nf(user.points)}</p></div>
          </div>

          <form onSubmit={submit} noValidate className="grid gap-3 rounded-3xl border border-line p-5">
            <p className="font-extrabold">Оноо нэмэх / хасах</p>
            <div className="flex gap-2">
              <div className="flex rounded-xl bg-brand-mist p-1" role="radiogroup" aria-label="Нэмэх эсвэл хасах">
                {['+', '−'].map((sg, i) => {
                  const v = i ? '-' : '+';
                  return (
                    <button key={v} type="button" role="radio" aria-checked={form.sign === v} onClick={() => setForm((f) => ({ ...f, sign: v }))}
                      className={`h-10 w-10 rounded-lg text-lg font-black ${form.sign === v ? (v === '+' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white') : 'text-ink-soft'}`}>{sg}</button>
                  );
                })}
              </div>
              <label className="sr-only" htmlFor="pp-amount">Оноо</label>
              <input id="pp-amount" type="number" min="1" inputMode="numeric" className={inputCls} placeholder="100" value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} aria-invalid={!!errors.amount} />
            </div>
            {errors.amount && <p className="text-sm font-semibold text-red-700">{errors.amount}</p>}
            <label className="text-sm font-bold" htmlFor="pp-reason">Шалтгаан</label>
            <input id="pp-reason" className={inputCls} placeholder="Жишээ: Англи хэлний олимпиадад 1-р байр" value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} aria-invalid={!!errors.reason} maxLength={200} />
            {errors.reason && <p className="text-sm font-semibold text-red-700">{errors.reason}</p>}
            <button disabled={busy} className="rounded-full bg-brand-blue py-3 text-sm font-extrabold uppercase tracking-wider text-white hover:bg-brand-royal disabled:opacity-60">
              {busy ? 'Хадгалж байна…' : 'Хадгалах'}</button>
          </form>

          <div className="grid gap-2">
            <p className="font-extrabold">Түүх</p>
            {!hist ? <div className="h-24 animate-pulse rounded-2xl bg-brand-mist" /> : !hist.length ? <p className="text-sm text-ink-soft">Түүх хоосон.</p> : (
              <ul className="divide-y divide-line rounded-2xl border border-line">
                {hist.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                    <div className="min-w-0 flex-1"><p className="font-bold">{TX_LABEL[t.kind] ?? t.kind}</p><p className="truncate text-xs text-ink-soft">{t.reason} · {fmtDate(t.createdAt)}</p></div>
                    <span className={`font-black tabular-nums ${t.amount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{t.amount > 0 ? '+' : ''}{nf(t.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </motion.aside>
    </div>
  );
}

export default function UsersPage() {
  const nav = useNavigate();
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.adminUsers().then(setUsers).catch((err) => (err.status === 401 ? nav('/admin/login', { replace: true }) : setError(err.message)));
  }, [nav]);

  const shown = useMemo(() => {
    if (!users) return [];
    const t = q.trim().toLowerCase();
    return users.filter((u) => !t || [u.name, u.email, u.phone].some((v) => String(v).toLowerCase().includes(t)));
  }, [users, q]);

  const updateBalance = (id, points) => {
    setUsers((xs) => xs.map((u) => (u.id === id ? { ...u, points } : u)));
    setSelected((s) => (s && s.id === id ? { ...s, points } : s));
  };

  if (error) return <p role="alert" className="rounded-2xl bg-red-50 p-4 font-semibold text-red-700">{error}</p>;
  if (!users) return <div className="h-96 animate-pulse rounded-3xl bg-white" />;

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-extrabold">Хэрэглэгчид, оноо</h1>
        <p className="text-ink-soft">Бүртгэлтэй эцэг эхчүүд. Мөр дээр дарж MindPoint оноо нэмэх, хасах боломжтой (олимпиад, идэвхтэй оролцоо гэх мэт).</p>
      </div>

      <label className="relative max-w-md">
        <span className="sr-only">Хайх</span>
        <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
        <input id="user-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Нэр, и-мэйл, утсаар хайх"
          className="w-full rounded-full border border-line bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-brand-blue" />
      </label>

      {!shown.length ? (
        <div className="rounded-3xl border border-dashed border-line bg-white px-6 py-14 text-center font-extrabold">{users.length ? 'Хайлтад тохирох хэрэглэгч алга' : 'Одоогоор бүртгэлтэй хэрэглэгч алга'}</div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-line bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-brand-mist/60 text-xs uppercase tracking-wider text-ink-soft">
              <tr>{['Нэр', 'И-мэйл', 'Утас', 'Төлсөн', 'Оноо', 'Бүртгүүлсэн'].map((h) => <th key={h} className="px-4 py-3 font-bold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {shown.map((u) => (
                <tr key={u.id} onClick={() => setSelected(u)} onKeyDown={(e) => e.key === 'Enter' && setSelected(u)} tabIndex={0}
                  className="cursor-pointer border-t border-line hover:bg-brand-mist/40 focus:bg-brand-mist/60 focus:outline-none">
                  <td className="px-4 py-3 font-bold">{u.name}</td>
                  <td className="px-4 py-3">
                    {u.email || <span className="text-ink-soft">—</span>}
                    {u.email && !u.emailVerified && !u.verified && <span className="ml-2 rounded-full bg-brand-yellow/25 px-2 py-0.5 text-[.68rem] font-bold text-[#8a6500]">баталгаажаагүй</span>}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {u.phone || <span className="text-ink-soft">—</span>}
                    {u.phone && !u.phoneVerified && !u.verified && <span className="ml-2 rounded-full bg-brand-yellow/25 px-2 py-0.5 text-[.68rem] font-bold text-[#8a6500]">баталгаажаагүй</span>}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{u.paidOrders}</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 font-black tabular-nums"><Coin className="h-5 w-5" />{nf(u.points)}</span></td>
                  <td className="px-4 py-3 text-ink-soft tabular-nums">{fmtDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {selected && <PointsPanel key="points-panel" user={selected} onClose={() => setSelected(null)} onChanged={updateBalance} />}
      </AnimatePresence>
    </div>
  );
}
