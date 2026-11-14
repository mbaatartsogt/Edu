import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../../lib/api';
import Icon from '../../components/ui/Icon';

const STATUS = {
  new: { label: 'Шинэ', cls: 'bg-brand-yellow/25 text-[#8a6500]' },
  contacted: { label: 'Холбогдсон', cls: 'bg-brand-sky/25 text-brand-royal' },
  done: { label: 'Шийдвэрлэсэн', cls: 'bg-emerald-100 text-emerald-700' },
};
const TOPIC = { question: 'Асуулт', enroll: 'Бүртгэл', price: 'Төлбөр', other: 'Бусад' };
const fmtPhone = (p) => `${p.slice(0, 4)} ${p.slice(4)}`;
const fmtDate = (iso) => new Date(iso).toLocaleString('mn-MN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

function Note({ item, onSave }) {
  const [v, setV] = useState(item.note || '');
  useEffect(() => setV(item.note || ''), [item.note]);
  return (
    <input id={`cnote-${item.id}`} value={v} onChange={(e) => setV(e.target.value)} placeholder="Тэмдэглэл бичих…" aria-label="Тэмдэглэл"
      onBlur={() => v !== (item.note || '') && onSave(v)} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      className="w-full rounded-xl border border-transparent bg-brand-mist/70 px-3 py-2 text-sm outline-none focus:border-brand-blue focus:bg-white" />
  );
}

export default function ChatLeadsPage() {
  const { flash, refreshCount } = useOutletContext();
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [openId, setOpenId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const fail = (err) => (err.status === 401 ? nav('/admin/login', { replace: true }) : flash(err.message, 'error'));

  useEffect(() => {
    api.chats().then(setItems)
      .catch((err) => (err.status === 401 ? nav('/admin/login', { replace: true }) : setError(err.message)))
      .finally(() => setLoading(false));
  }, [nav]);

  async function update(id, patch) {
    const prev = items;
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    try {
      await api.updateChat(id, patch);
      flash('Хадгаллаа');
      if (patch.status) refreshCount();
    } catch (err) { setItems(prev); fail(err); }
  }

  async function remove(id) {
    setConfirmId(null);
    try {
      await api.deleteChat(id);
      setItems((xs) => xs.filter((x) => x.id !== id));
      refreshCount();
      flash('Устгалаа');
    } catch (err) { fail(err); }
  }

  const counts = useMemo(() => Object.fromEntries(['all', ...Object.keys(STATUS)].map((k) => [k, k === 'all' ? items.length : items.filter((x) => x.status === k).length])), [items]);
  const shown = filter === 'all' ? items : items.filter((x) => x.status === filter);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-extrabold">Чат мессежүүд</h1>
        <p className="text-ink-soft">Чат-ботоор нэр, утасны дугаараа үлдээсэн хүмүүс. Холбогдсоныхоо дараа төлөвийг шинэчилнэ үү.</p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Төлөвөөр шүүх">
        {[['all', 'Бүгд'], ...Object.entries(STATUS).map(([k, v]) => [k, v.label])].map(([k, label]) => (
          <button key={k} role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${filter === k ? 'bg-brand-navy text-white' : 'border border-line bg-white hover:border-brand-blue'}`}>
            {label} <span className="ml-1 tabular-nums opacity-70">{counts[k]}</span>
          </button>
        ))}
      </div>

      {error && <p role="alert" className="rounded-2xl bg-red-50 p-4 font-semibold text-red-700">{error}</p>}

      {loading ? (
        <div className="grid gap-4">{[0, 1, 2].map((i) => <div key={i} className="h-36 animate-pulse rounded-3xl bg-white" />)}</div>
      ) : !shown.length ? (
        <div className="grid justify-items-center gap-2 rounded-3xl border border-dashed border-line bg-white px-6 py-14 text-center">
          <Icon name="messenger" className="h-8 w-8 text-brand-sky" />
          <p className="font-extrabold">{items.length ? 'Энэ төлөвт мессеж алга' : 'Одоогоор чатаар мэдээлэл үлдээгээгүй байна'}</p>
          <p className="text-sm text-ink-soft">Сайтын баруун доод буланд байгаа чатаар үлдээсэн мэдээлэл энд харагдана.</p>
        </div>
      ) : (
        <ul className="grid gap-4">
          <AnimatePresence initial={false}>
            {shown.map((c) => (
              <motion.li key={c.id} layout exit={{ opacity: 0, x: 30 }}
                className={`grid gap-3 rounded-3xl border bg-white p-5 ${c.status === 'new' ? 'border-brand-yellow shadow-[0_0_0_3px_rgb(var(--c-yellow)/.25)]' : 'border-line'}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-lg font-extrabold">
                      {c.name}{c.age ? <span className="font-semibold text-ink-soft"> · хүүхэд {c.age} нас</span> : null}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                      <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 font-bold text-brand-blue tabular-nums"><Icon name="phone" className="h-4 w-4" />{fmtPhone(c.phone)}</a>
                      <span className="rounded-full bg-brand-mist px-2.5 py-0.5 text-xs font-bold text-brand-royal">{TOPIC[c.topic] ?? c.topic}</span>
                      <span className="text-ink-soft tabular-nums">{fmtDate(c.createdAt)}</span>
                    </div>
                  </div>
                  <select id={`cst-${c.id}`} value={c.status} onChange={(e) => update(c.id, { status: e.target.value })} aria-label="Төлөв солих"
                    className={`cursor-pointer rounded-full border-0 px-3 py-1.5 text-xs font-bold outline-none focus-visible:ring-2 focus-visible:ring-brand-blue ${STATUS[c.status]?.cls}`}>
                    {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>

                {c.message && <p className="whitespace-pre-line rounded-2xl bg-brand-mist/60 px-4 py-3 text-[.95rem]">“{c.message}”</p>}

                <div className="flex flex-wrap items-center gap-2">
                  <div className="min-w-0 flex-1 basis-56"><Note item={c} onSave={(note) => update(c.id, { note })} /></div>
                  <button onClick={() => setOpenId(openId === c.id ? null : c.id)} aria-expanded={openId === c.id}
                    className="rounded-full border border-line px-3 py-1.5 text-xs font-bold hover:border-brand-blue">
                    {openId === c.id ? 'Яриаг хураах' : `Яриаг харах (${c.transcript.length})`}
                  </button>
                  {confirmId === c.id ? (
                    <>
                      <button onClick={() => remove(c.id)} className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-bold text-white">Устгах</button>
                      <button onClick={() => setConfirmId(null)} className="rounded-full border border-line px-3 py-1.5 text-xs font-bold">Болих</button>
                    </>
                  ) : (
                    <button onClick={() => setConfirmId(c.id)} aria-label="Устгах" className="rounded-lg p-2 text-ink-soft hover:bg-red-50 hover:text-red-600"><Icon name="trash" className="h-4 w-4" /></button>
                  )}
                </div>

                <AnimatePresence initial={false}>
                  {openId === c.id && (
                    <motion.div key="transcript" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="grid max-h-80 gap-2 overflow-y-auto rounded-2xl bg-brand-mist/50 p-4">
                        {c.transcript.map((m, i) => (
                          <p key={i} className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${m.from === 'user' ? 'justify-self-end bg-brand-blue text-white' : 'bg-white'}`}>{m.text}</p>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
