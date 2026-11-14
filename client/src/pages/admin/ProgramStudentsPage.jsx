import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import { programThemes, themeCls } from '../../data/themes';
import Icon from '../../components/ui/Icon';

const DAY = 864e5;
const nf = (n) => new Intl.NumberFormat('en-US').format(n);
const fmtDay = (d) => new Date(d).toLocaleDateString('mn-MN', { year: 'numeric', month: '2-digit', day: '2-digit' });
const fmtPhone = (p) => (p ? `${p.slice(0, 4)} ${p.slice(4)}` : '—');

export const STATE = {
  active: { label: 'Идэвхтэй', chip: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500' },
  soon: { label: 'Удахгүй төлөх', chip: 'bg-brand-yellow/30 text-[#7a5a00]', bar: 'bg-brand-yellow' },
  overdue: { label: 'Хугацаа хэтэрсэн', chip: 'bg-red-100 text-red-700', bar: 'bg-red-500' },
  unpaid: { label: 'Төлөөгүй', chip: 'bg-slate-200 text-slate-600', bar: 'bg-slate-300' },
  onetime: { label: 'Төлсөн (нэг удаа)', chip: 'bg-brand-sky/25 text-brand-royal', bar: 'bg-brand-blue' },
};

/** Төлбөрийн хугацааны тооцоо: төлсөн өдрөөс billingDays-ийн дараа дараагийн төлбөр */
export function track(s, program, now) {
  if (s.status !== 'paid' || !s.paidAt) return { state: 'unpaid', progress: 0 };
  const days = program?.billingDays ?? 30;
  if (!days) return { state: 'onetime', progress: 1 };
  const start = new Date(s.paidAt).getTime();
  const due = start + days * DAY;
  const left = Math.ceil((due - now) / DAY);
  return {
    state: left < 0 ? 'overdue' : left <= 7 ? 'soon' : 'active',
    progress: Math.min(1, Math.max(0, (now - start) / (days * DAY))),
    due, left, days,
  };
}

function ProgressBar({ t }) {
  const st = STATE[t.state];
  const pct = Math.round(t.progress * 100);
  return (
    <div className="grid gap-1.5">
      <div className="h-2.5 overflow-hidden rounded-full bg-brand-mist" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
        aria-label={t.due ? `Төлбөрийн хугацаа ${pct}% өнгөрсөн` : st.label}>
        <motion.div className={`h-full rounded-full ${st.bar}`} initial={{ width: 0 }} animate={{ width: `${t.state === 'unpaid' ? 100 : pct}%` }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
      </div>
      <p className="text-xs font-semibold text-ink-soft tabular-nums">
        {t.state === 'unpaid' ? 'Төлбөр хүлээгдэж байна'
          : t.state === 'onetime' ? 'Дараагийн төлбөргүй'
          : t.left < 0 ? <span className="text-red-600">{-t.left} хоног хэтэрсэн</span>
          : t.left === 0 ? <span className="text-[#7a5a00]">Өнөөдөр төлөх</span>
          : `${t.left} хоног үлдсэн`}
      </p>
    </div>
  );
}

export default function ProgramStudentsPage() {
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [branch, setBranch] = useState('');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState({});

  useEffect(() => {
    api.programStudents().then(setData).catch((err) => (err.status === 401 ? nav('/admin/login', { replace: true }) : setError(err.message)));
  }, [nav]);

  const view = useMemo(() => {
    if (!data) return null;
    const now = Date.now();
    const byId = Object.fromEntries(data.programs.map((p) => [p.id, p]));
    const rows = data.students.map((s) => ({ ...s, t: track(s, byId[s.programId], now) }));
    const counts = { all: rows.length };
    for (const r of rows) counts[r.t.state] = (counts[r.t.state] || 0) + 1;
    const term = q.trim().toLowerCase();
    const branches = [...new Set(rows.map((r) => r.branchName).filter(Boolean))].sort();
    const shown = rows.filter((r) => (filter === 'all' || r.t.state === filter) && (!branch || r.branchName === branch)
      && (!term || [r.childName, r.parentName, r.parentPhone, r.parentEmail].some((v) => String(v ?? '').toLowerCase().includes(term))));
    // Анхаарах шаардлагатайг дээр: хэтэрсэн → удахгүй → төлөөгүй → идэвхтэй
    const order = { overdue: 0, soon: 1, unpaid: 2, active: 3, onetime: 4 };
    shown.sort((a, b) => order[a.t.state] - order[b.t.state] || (a.t.left ?? 999) - (b.t.left ?? 999));
    const groups = data.programs.map((p) => ({ program: p, all: rows.filter((r) => r.programId === p.id), rows: shown.filter((r) => r.programId === p.id) }));
    const orphan = shown.filter((r) => !byId[r.programId]);
    if (orphan.length) groups.push({ program: { id: 'other', title: 'Устгагдсан хөтөлбөр', age: '', theme: 'blue', billingDays: 30 }, all: orphan, rows: orphan });
    return { counts, groups, branches };
  }, [data, filter, branch, q]);

  if (error) return <p role="alert" className="rounded-2xl bg-red-50 p-4 font-semibold text-red-700">{error}</p>;
  if (!view) return <div className="h-96 animate-pulse rounded-3xl bg-white" />;
  const { counts } = view;

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-extrabold">Хөтөлбөр, сурагчид</h1>
        <p className="max-w-[70ch] text-ink-soft">Хөтөлбөр бүрт бүртгэлтэй хүүхдүүд, сүүлийн төлбөр, дараагийн төлбөр хүртэлх хугацаа. Төлбөрийн давтамжийг “Хөтөлбөрүүд” хэсгээс тохируулна (анхдагч 30 хоног).</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[['active', 'Идэвхтэй сурагч', 'bg-emerald-300/50'], ['soon', '7 хоногт төлөх', 'bg-brand-yellow/60'], ['overdue', 'Хугацаа хэтэрсэн', 'bg-red-300/50'], ['unpaid', 'Төлөөгүй захиалга', 'bg-slate-300/60']].map(([k, label, accent], i) => (
          <motion.button key={k} onClick={() => setFilter(filter === k ? 'all' : k)} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={`relative overflow-hidden rounded-3xl border-2 bg-white p-5 text-left transition ${filter === k ? 'border-brand-blue' : 'border-transparent hover:border-line'}`}>
            <span className={`absolute -right-5 -top-5 h-16 w-16 rounded-full ${accent}`} aria-hidden="true" />
            <p className="text-sm font-semibold text-ink-soft">{label}</p>
            <p className="mt-1 text-3xl font-black tabular-nums">{counts[k] || 0}</p>
          </motion.button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="relative min-w-0 flex-1 basis-60">
          <span className="sr-only">Хайх</span>
          <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <input id="ps-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Хүүхэд, эцэг эхийн нэр, утсаар хайх"
            className="w-full rounded-full border border-line bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-brand-blue" />
        </label>
        {view.branches.length > 0 && (
          <select id="ps-branch" value={branch} onChange={(e) => setBranch(e.target.value)} aria-label="Салбараар шүүх"
            className="rounded-full border border-line bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-brand-blue">
            <option value="">Бүх салбар</option>
            {view.branches.map((b) => <option key={b}>{b}</option>)}
          </select>
        )}
        {filter !== 'all' && (
          <button onClick={() => setFilter('all')} className="flex items-center gap-1.5 rounded-full bg-brand-navy px-4 py-3 text-sm font-bold text-white">
            {STATE[filter].label} <Icon name="close" className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="grid gap-5">
        {view.groups.map(({ program: p, all, rows }) => {
          const paidActive = all.filter((r) => ['active', 'soon', 'onetime'].includes(r.t.state)).length;
          const cap = p.capacity;
          const collapsed = open[p.id] === false;
          return (
            <section key={p.id} className="overflow-hidden rounded-4xl border border-line bg-white" aria-labelledby={`pg-${p.id}`}>
              <button onClick={() => setOpen((o) => ({ ...o, [p.id]: collapsed }))} aria-expanded={!collapsed}
                className="flex w-full flex-wrap items-center gap-4 p-5 text-left hover:bg-brand-mist/40">
                <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-center text-sm font-black leading-tight text-white ${themeCls(programThemes, p.theme)}`}>
                  {p.age || '—'}
                </span>
                <div className="min-w-0 flex-1 basis-48">
                  <h2 id={`pg-${p.id}`} className="text-lg font-extrabold">{p.title}</h2>
                  <p className="text-sm text-ink-soft">
                    {p.price ? `${nf(p.price)}₮ ${p.priceLabel || ''}` : 'Үнэ тохируулаагүй'} · {p.billingDays ? `${p.billingDays} хоног тутам` : 'нэг удаагийн төлбөр'}
                  </p>
                </div>
                <div className="grid min-w-[180px] flex-1 basis-48 gap-1.5 sm:max-w-xs">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Анги дүүргэлт</span>
                    <span className="tabular-nums">{paidActive}{cap ? ` / ${cap}` : ' сурагч'}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-brand-mist">
                    <motion.div className={`h-full rounded-full ${cap && paidActive >= cap ? 'bg-red-500' : 'bg-gradient-to-r from-brand-sky to-brand-blue'}`}
                      initial={{ width: 0 }} animate={{ width: `${cap ? Math.min(100, (paidActive / cap) * 100) : Math.min(100, paidActive * 6)}%` }} transition={{ duration: 0.9 }} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {['overdue', 'soon', 'unpaid'].map((k) => {
                    const n = all.filter((r) => r.t.state === k).length;
                    return n ? <span key={k} className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${STATE[k].chip}`}>{n} {STATE[k].label.toLowerCase()}</span> : null;
                  })}
                </div>
                <Icon name={collapsed ? 'down' : 'up'} className="h-5 w-5 text-ink-soft" />
              </button>

              {!collapsed && (
                rows.length === 0 ? (
                  <p className="border-t border-line px-5 py-6 text-center text-sm text-ink-soft">{all.length ? 'Шүүлтэд тохирох сурагч алга' : 'Одоогоор бүртгэлтэй сурагч алга'}</p>
                ) : (
                  <ul className="divide-y divide-line border-t border-line">
                    {rows.map((r) => (
                      <li key={r.id} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,.9fr)_minmax(0,1.3fr)_auto] md:items-center">
                        <div className="min-w-0">
                          <p className="font-extrabold">{r.childName} <span className="font-semibold text-ink-soft">· {r.childAge} нас</span></p>
                          <p className="truncate text-xs text-ink-soft">{r.branchName || 'Салбар сонгоогүй'}{r.paidCount > 1 ? ` · ${r.paidCount} дахь төлбөр` : ''}</p>
                        </div>
                        <div className="min-w-0 text-sm">
                          <p className="truncate font-bold">{r.parentName}</p>
                          {r.parentPhone ? <a href={`tel:${r.parentPhone}`} className="font-semibold text-brand-blue tabular-nums">{fmtPhone(r.parentPhone)}</a>
                            : <span className="truncate text-ink-soft">{r.parentEmail}</span>}
                        </div>
                        <div className="text-xs tabular-nums">
                          <p><span className="text-ink-soft">Төлсөн:</span> <b>{r.paidAt ? fmtDay(r.paidAt) : '—'}</b></p>
                          <p><span className="text-ink-soft">Дараагийн:</span> <b className={r.t.state === 'overdue' ? 'text-red-600' : ''}>{r.t.due ? fmtDay(r.t.due) : '—'}</b></p>
                        </div>
                        <ProgressBar t={r.t} />
                        <span className={`w-fit rounded-full px-3 py-1 text-xs font-extrabold ${STATE[r.t.state].chip}`}>{STATE[r.t.state].label}</span>
                      </li>
                    ))}
                  </ul>
                )
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
