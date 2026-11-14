import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { api, auth } from '../../lib/api';
import { schedules } from '../../data/content';
import Icon from '../../components/ui/Icon';

export const STATUS = {
  new: { label: 'Шинэ', cls: 'bg-brand-yellow/25 text-[#8a6500]' },
  contacted: { label: 'Холбогдсон', cls: 'bg-brand-sky/25 text-brand-royal' },
  tested: { label: 'Шалгалт өгсөн', cls: 'bg-purple-100 text-purple-700' },
  enrolled: { label: 'Элссэн', cls: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Цуцалсан', cls: 'bg-slate-200 text-slate-600' },
};
const scheduleLabel = Object.fromEntries(schedules.map((s) => [s.id, s.label]));
const fmtPhone = (p) => `${p.slice(0, 4)} ${p.slice(4)}`;
const fmtDate = (iso) => new Date(iso).toLocaleString('mn-MN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
const group = (age) => (age <= 11 ? '8-11' : age <= 14 ? '12-14' : '15-18');

function toCSV(rows) {
  const head = ['Огноо', 'Хүүхдийн нэр', 'Нас', 'Бүлэг', 'Утас', 'Хуваарь', 'Төлөв', 'Тэмдэглэл'];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = rows.map((r) => [new Date(r.createdAt).toLocaleString('mn-MN'), r.childName, r.age, group(r.age), r.phone,
    scheduleLabel[r.schedule] ?? r.schedule, STATUS[r.status]?.label, r.note].map(esc).join(','));
  return '﻿' + [head.map(esc).join(','), ...lines].join('\n'); // BOM → Excel кирилл зөв харуулна
}

function StatCard({ label, value, accent, i }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
      className="relative overflow-hidden rounded-3xl border border-line bg-white p-5">
      <span className={`absolute -right-5 -top-5 h-16 w-16 rounded-full ${accent}`} aria-hidden="true" />
      <p className="text-sm font-semibold text-ink-soft">{label}</p>
      <p className="mt-1 text-4xl font-black tabular-nums">{value}</p>
    </motion.div>
  );
}

function StatusSelect({ value, onChange, id }) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} aria-label="Төлөв солих"
      className={`cursor-pointer rounded-full border-0 px-3 py-1.5 text-xs font-bold outline-none focus-visible:ring-2 focus-visible:ring-brand-blue ${STATUS[value]?.cls}`}>
      {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
    </select>
  );
}

function NoteInput({ row, onSave }) {
  const [v, setV] = useState(row.note || '');
  useEffect(() => setV(row.note || ''), [row.note]);
  return (
    <input id={`note-${row.id}`} value={v} onChange={(e) => setV(e.target.value)} placeholder="Тэмдэглэл…" aria-label="Тэмдэглэл"
      onBlur={() => v !== (row.note || '') && onSave(v)} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      className="w-full min-w-[140px] rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm hover:border-line focus:border-brand-blue focus:bg-white focus:outline-none" />
  );
}

export default function EnrollmentsPage() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [confirmId, setConfirmId] = useState(null);
  const { flash, refreshCount } = useOutletContext();

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [list, s] = await Promise.all([api.enrollments(), api.stats()]);
      setRows(list); setStats(s);
    } catch (err) {
      if (err.status === 401) return nav('/admin/login', { replace: true });
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [nav]);

  useEffect(() => {
    if (!auth.token) { nav('/admin/login', { replace: true }); return; }
    load();
  }, [load, nav]);

  async function update(id, patch) {
    const prev = rows;
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    try {
      await api.updateEnrollment(id, patch);
      flash('Хадгаллаа');
      if (patch.status) { setStats(await api.stats()); refreshCount(); }
    } catch (err) { setRows(prev); flash(err.message); }
  }

  async function remove(id) {
    setConfirmId(null);
    try {
      await api.deleteEnrollment(id);
      setRows((r) => r.filter((x) => x.id !== id));
      setStats(await api.stats());
      refreshCount();
      flash('Устгалаа');
    } catch (err) { flash(err.message); }
  }

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) =>
      (statusFilter === 'all' || r.status === statusFilter) &&
      (groupFilter === 'all' || group(r.age) === groupFilter) &&
      (!term || r.childName.toLowerCase().includes(term) || r.phone.includes(term.replace(/\D/g, '') || '\0')));
  }, [rows, q, statusFilter, groupFilter]);

  function exportCSV() {
    const blob = new Blob([toCSV(filtered)], { type: 'text/csv;charset=utf-8' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob), download: `mindedu-burtgel-${new Date().toISOString().slice(0, 10)}.csv`,
    });
    a.click(); URL.revokeObjectURL(a.href);
  }

  const maxGroup = stats ? Math.max(1, ...Object.values(stats.byGroup)) : 1;

  return (
    <div className="grid gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold">Хуучин хүсэлтүүд</h1>
            <p className="text-ink-soft">Өмнөх бүртгэлийн маягтаар ирсэн хүсэлтүүд. Шинэ элсэлт “Захиалга, төлбөр” хэсэгт орно.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2.5 text-sm font-bold hover:border-brand-blue">
              <Icon name="refresh" className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Шинэчлэх</button>
            <button onClick={exportCSV} disabled={!filtered.length} className="flex items-center gap-2 rounded-full bg-brand-blue px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-royal disabled:opacity-50">
              <Icon name="download" className="h-4 w-4" /> CSV татах</button>
          </div>
        </div>

        {error && <p role="alert" className="rounded-2xl bg-red-50 p-4 font-semibold text-red-700">{error}</p>}

        {stats && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard i={0} label="Нийт хүсэлт" value={stats.total} accent="bg-brand-sky/40" />
            <StatCard i={1} label="Сүүлийн 7 хоногт" value={stats.thisWeek} accent="bg-brand-blue/30" />
            <StatCard i={2} label="Шинэ (холбогдоогүй)" value={stats.byStatus.new} accent="bg-brand-yellow/60" />
            <StatCard i={3} label="Элссэн" value={stats.byStatus.enrolled} accent="bg-emerald-300/60" />
          </div>
        )}

        {stats && (
          <div className="grid gap-4 rounded-3xl border border-line bg-white p-5 md:grid-cols-[auto_1fr] md:items-center md:gap-8">
            <p className="font-extrabold">Насны бүлгээр</p>
            <div className="grid gap-2.5">
              {Object.entries(stats.byGroup).map(([g, n]) => (
                <div key={g} className="grid grid-cols-[52px_1fr_32px] items-center gap-3 text-sm">
                  <span className="font-bold tabular-nums">{g}</span>
                  <div className="h-3 overflow-hidden rounded-full bg-brand-mist">
                    <motion.div className="h-full rounded-full bg-gradient-to-r from-brand-sky to-brand-blue"
                      initial={{ width: 0 }} animate={{ width: `${(n / maxGroup) * 100}%` }} transition={{ duration: 0.8 }} />
                  </div>
                  <span className="text-right font-bold tabular-nums">{n}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <label className="relative min-w-0 flex-1 basis-60">
            <span className="sr-only">Хайх</span>
            <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <input id="admin-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Нэр эсвэл утасны дугаараар хайх"
              className="w-full rounded-full border border-line bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-brand-blue" />
          </label>
          <select id="admin-status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Төлөвөөр шүүх"
            className="rounded-full border border-line bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-brand-blue">
            <option value="all">Бүх төлөв</option>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select id="admin-group" value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} aria-label="Насны бүлгээр шүүх"
            className="rounded-full border border-line bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-brand-blue">
            <option value="all">Бүх нас</option>
            <option value="8-11">8–11 нас</option><option value="12-14">12–14 нас</option><option value="15-18">15–18 нас</option>
          </select>
        </div>

        <div className="overflow-hidden rounded-3xl border border-line bg-white">
          {!loading && !filtered.length ? (
            <div className="grid justify-items-center gap-2 px-6 py-16 text-center">
              <span className="check3d !h-14 !w-14 opacity-80"><Icon name="search" className="h-6 w-6 text-white" /></span>
              <p className="mt-2 font-extrabold">{rows.length ? 'Шүүлтэд тохирох хүсэлт алга' : 'Одоогоор бүртгэл ирээгүй байна'}</p>
              <p className="text-sm text-ink-soft">{rows.length ? 'Шүүлтүүрээ өөрчилж үзнэ үү.' : 'Сайтын бүртгэлийн маягтаар илгээсэн хүсэлтүүд энд харагдана.'}</p>
            </div>
          ) : (
            <>
              {/* Desktop хүснэгт */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-brand-mist/60 text-xs uppercase tracking-wider text-ink-soft">
                    <tr>{['Огноо', 'Хүүхэд', 'Нас', 'Утас', 'Хуваарь', 'Төлөв', 'Тэмдэглэл', ''].map((h) => <th key={h} className="px-4 py-3 font-bold">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    <AnimatePresence initial={false}>
                      {filtered.map((r) => (
                        <motion.tr key={r.id} layout exit={{ opacity: 0, x: 30 }} className="border-t border-line hover:bg-brand-mist/40">
                          <td className="whitespace-nowrap px-4 py-3 tabular-nums text-ink-soft">{fmtDate(r.createdAt)}</td>
                          <td className="px-4 py-3 font-bold">{r.childName}</td>
                          <td className="px-4 py-3 tabular-nums">{r.age}</td>
                          <td className="whitespace-nowrap px-4 py-3 tabular-nums">{fmtPhone(r.phone)}</td>
                          <td className="whitespace-nowrap px-4 py-3">{scheduleLabel[r.schedule] ?? r.schedule}</td>
                          <td className="px-4 py-3"><StatusSelect id={`st-${r.id}`} value={r.status} onChange={(s) => update(r.id, { status: s })} /></td>
                          <td className="px-2 py-2"><NoteInput row={r} onSave={(note) => update(r.id, { note })} /></td>
                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            {confirmId === r.id ? (
                              <span className="inline-flex gap-1.5">
                                <button onClick={() => remove(r.id)} className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-bold text-white">Устгах</button>
                                <button onClick={() => setConfirmId(null)} className="rounded-full border border-line px-3 py-1.5 text-xs font-bold">Болих</button>
                              </span>
                            ) : (
                              <button onClick={() => setConfirmId(r.id)} aria-label={`${r.childName}-ийн хүсэлтийг устгах`}
                                className="rounded-lg p-2 text-ink-soft hover:bg-red-50 hover:text-red-600"><Icon name="trash" className="h-4 w-4" /></button>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>

              {/* Гар утасны карт жагсаалт */}
              <ul className="divide-y divide-line md:hidden">
                {filtered.map((r) => (
                  <li key={r.id} className="grid gap-2.5 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-extrabold">{r.childName} <span className="font-semibold text-ink-soft">· {r.age} нас</span></p>
                        <a href={`tel:${r.phone}`} className="text-sm font-semibold text-brand-blue tabular-nums">{fmtPhone(r.phone)}</a>
                      </div>
                      <StatusSelect id={`stm-${r.id}`} value={r.status} onChange={(s) => update(r.id, { status: s })} />
                    </div>
                    <p className="text-xs text-ink-soft">{scheduleLabel[r.schedule]} · {fmtDate(r.createdAt)}</p>
                    <div className="flex items-center gap-2">
                      <div className="min-w-0 flex-1 rounded-lg bg-brand-mist/60"><NoteInput row={r} onSave={(note) => update(r.id, { note })} /></div>
                      {confirmId === r.id ? (
                        <>
                          <button onClick={() => remove(r.id)} className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-bold text-white">Устгах</button>
                          <button onClick={() => setConfirmId(null)} className="rounded-full border border-line px-3 py-1.5 text-xs font-bold">Болих</button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmId(r.id)} aria-label="Устгах" className="rounded-lg p-2 text-ink-soft hover:text-red-600">
                          <Icon name="trash" className="h-4 w-4" /></button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <p className="text-sm text-ink-soft">{filtered.length} / {rows.length} хүсэлт харагдаж байна</p>
    </div>
  );
}
