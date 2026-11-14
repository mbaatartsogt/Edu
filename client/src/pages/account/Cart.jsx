import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../../lib/api';
import { money } from '../../lib/user';
import { useCart } from '../../lib/cart';
import { programThemes, themeCls } from '../../data/themes';
import Icon, { Coin } from '../../components/ui/Icon';

const nf = (n) => new Intl.NumberFormat('en-US').format(n);

function validate(items, byId, hasBranches) {
  return items.map((it) => {
    const e = {};
    const p = byId[it.programId];
    if (!p) e.programId = 'Энэ хөтөлбөр одоо идэвхгүй байна. Сагснаас хасна уу.';
    else if (!p.price) e.programId = 'Үнэ тохируулагдаагүй хөтөлбөр. Сагснаас хасна уу.';
    if (String(it.childName).trim().length < 2) e.childName = 'Хүүхдийн нэрийг оруулна уу.';
    if (!it.childAge) e.childAge = 'Насыг сонгоно уу.';
    if (hasBranches && !it.branchId) e.branchId = 'Салбараа сонгоно уу.';
    return Object.keys(e).length ? e : null;
  });
}

export default function Cart() {
  const { items, update, remove, clear } = useCart();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [errors, setErrors] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.content().then(setData).catch((e) => setError(e.message)); }, []);

  if (!data) return error ? <p role="alert" className="rounded-2xl bg-red-50 p-4 font-semibold text-red-700">{error}</p> : <div className="h-96 animate-pulse rounded-4xl bg-white" />;

  const byId = Object.fromEntries(data.programs.map((p) => [p.id, p]));
  const total = items.reduce((s, it) => s + (byId[it.programId]?.price || 0), 0);
  const per1000 = Number(data.settings.pointsPer1000) || 0;
  const earn = Math.floor((total / 1000) * per1000);
  const hasBranches = data.branches.length > 0;

  const set = (key, idx, field) => (e) => {
    update(key, { [field]: e.target.value });
    if (error) setError('');
    if (errors[idx]?.[field]) setErrors((xs) => xs.map((x, i) => (i === idx ? { ...x, [field]: undefined } : x)));
  };

  async function checkout() {
    const errs = validate(items, byId, hasBranches);
    setErrors(errs); setError('');
    if (errs.some(Boolean)) {
      setError('Тэмдэглэсэн талбаруудыг бөглөнө үү.');
      document.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    setBusy(true);
    try {
      const order = await api.createOrder({
        items: items.map((it) => ({ programId: it.programId, childName: it.childName.trim(), childAge: Number(it.childAge), branchId: it.branchId || undefined })),
      });
      clear();
      nav(`/account/orders/${order.id}`, { replace: true });
    } catch (err) {
      if (err.body?.errors?.items) { setErrors(err.body.errors.items); setError('Тэмдэглэсэн талбаруудыг шалгана уу.'); }
      else setError(err.message);
      setBusy(false);
    }
  }

  if (!items.length) {
    return (
      <div className="mx-auto grid max-w-lg justify-items-center gap-4 rounded-4xl bg-white p-10 text-center">
        <span className="icon3d !h-16 !w-16"><Icon name="cart" className="h-8 w-8 text-brand-blue" /></span>
        <h1 className="text-2xl font-extrabold">Сагс хоосон байна</h1>
        <p className="text-ink-soft">Хөтөлбөрүүдээс сонгоод сагсанд нэмээрэй. Хэд хэдэн хөтөлбөрийг нэг дор төлж болно.</p>
        <Link to="/account/programs" className="btn-blue">Хөтөлбөр сонгох</Link>
      </div>
    );
  }

  const inputCls = (bad) => `w-full rounded-xl border-2 bg-brand-mist px-3.5 py-2.5 font-medium text-ink outline-none transition focus:border-brand-blue focus:bg-white ${bad ? 'border-red-500' : 'border-transparent'}`;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-2">
          <span className="eyebrow">Сагс</span>
          <h1 className="h2">Сагсанд <b className="font-extrabold">{items.length} хөтөлбөр</b></h1>
        </div>
        <Link to="/account/programs" className="flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2.5 text-sm font-bold hover:border-brand-blue">
          <Icon name="plus" className="h-4 w-4" strokeWidth={2.6} /> Өөр хөтөлбөр нэмэх
        </Link>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <ul className="grid gap-4">
          <AnimatePresence initial={false}>
            {items.map((it, idx) => {
              const p = byId[it.programId];
              const e = errors[idx] || {};
              const id = (f) => `cart-${it.key}-${f}`;
              return (
                <motion.li key={it.key} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -40, height: 0, marginBottom: -16 }}
                  className={`overflow-hidden rounded-4xl border-2 bg-white ${e.programId ? 'border-red-300' : 'border-transparent'}`}>
                  <div className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
                    <div className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white ${p ? themeCls(programThemes, p.theme) : 'from-slate-300 to-slate-400'}`}>
                      <span className="text-center text-sm font-black leading-tight">{p?.age ?? '—'}<br /><span className="text-[.65rem] font-semibold">нас</span></span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold">{p?.title ?? 'Хөтөлбөр олдсонгүй'}</p>
                      {p && <p className="text-sm text-ink-soft">{[p.level, p.days, p.classTime].filter(Boolean).join(' · ')}</p>}
                      {e.programId && <p className="text-sm font-semibold text-red-700">{e.programId}</p>}
                    </div>
                    <p className="text-xl font-black tabular-nums">{p?.price ? money(p.price) : '—'}<span className="ml-1 text-xs font-semibold text-ink-soft">{p?.priceLabel}</span></p>
                    <button onClick={() => remove(it.key)} aria-label={`${p?.title ?? 'Хөтөлбөр'}-ийг сагснаас хасах`} className="rounded-xl p-2 text-ink-soft hover:bg-red-50 hover:text-red-600">
                      <Icon name="trash" className="h-5 w-5" />
                    </button>
                  </div>
                  <div className={`grid gap-3 border-t border-line bg-brand-mist/40 p-4 sm:p-5 ${hasBranches ? 'sm:grid-cols-[1.3fr_.7fr_1.2fr]' : 'sm:grid-cols-[1.3fr_.7fr]'}`}>
                    <div className="grid gap-1">
                      <label htmlFor={id('name')} className="text-xs font-bold">Хүүхдийн нэр</label>
                      <input id={id('name')} className={inputCls(e.childName)} value={it.childName} onChange={set(it.key, idx, 'childName')} placeholder="Тэмүүжин" aria-invalid={!!e.childName} />
                      {e.childName && <span className="text-xs font-semibold text-red-700">{e.childName}</span>}
                    </div>
                    <div className="grid gap-1">
                      <label htmlFor={id('age')} className="text-xs font-bold">Нас</label>
                      <select id={id('age')} className={inputCls(e.childAge)} value={it.childAge} onChange={set(it.key, idx, 'childAge')} aria-invalid={!!e.childAge}>
                        <option value="">Сонгох</option>
                        {Array.from({ length: 11 }, (_, i) => i + 8).map((a) => <option key={a} value={a}>{a}</option>)}
                      </select>
                      {e.childAge && <span className="text-xs font-semibold text-red-700">{e.childAge}</span>}
                    </div>
                    {hasBranches && (
                      <div className="grid gap-1">
                        <label htmlFor={id('branch')} className="text-xs font-bold">Салбар</label>
                        <select id={id('branch')} className={inputCls(e.branchId)} value={it.branchId} onChange={set(it.key, idx, 'branchId')} aria-invalid={!!e.branchId}>
                          <option value="">Сонгох</option>
                          {data.branches.map((b) => <option key={b.id} value={b.id}>{[b.name, b.region].filter(Boolean).join(' ')}</option>)}
                        </select>
                        {e.branchId && <span className="text-xs font-semibold text-red-700">{e.branchId}</span>}
                      </div>
                    )}
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>

        <aside className="grid gap-4 rounded-4xl bg-white p-6 shadow-card lg:sticky lg:top-8" aria-labelledby="sum-title">
          <h2 id="sum-title" className="text-lg font-extrabold">Төлбөрийн дүн</h2>
          <ul className="grid gap-2 text-sm">
            {items.map((it) => {
              const p = byId[it.programId];
              return (
                <li key={it.key} className="flex justify-between gap-3">
                  <span className="min-w-0 truncate text-ink-soft">{p?.title ?? '—'}{it.childName ? ` · ${it.childName}` : ''}</span>
                  <span className="shrink-0 font-semibold tabular-nums">{p?.price ? money(p.price) : '—'}</span>
                </li>
              );
            })}
          </ul>
          <div className="flex items-end justify-between border-t border-dashed border-line pt-4">
            <span className="font-bold">Нийт</span>
            <motion.span key={total} initial={{ scale: 1.15 }} animate={{ scale: 1 }} className="text-3xl font-black tabular-nums">{money(total)}</motion.span>
          </div>
          {earn > 0 && (
            <p className="flex items-center gap-2 rounded-2xl bg-brand-yellow/15 px-3 py-2.5 text-sm font-bold text-[#7a5a00]">
              <Coin className="h-6 w-6" /> Төлбөр төлөхөд +{nf(earn)} MindPoint
            </p>
          )}
          {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
          <button onClick={checkout} disabled={busy || total <= 0} className="btn-blue">
            {busy ? 'Нэхэмжлэх үүсгэж байна…' : <>QPay-аар төлөх · {money(total)}</>}
          </button>
          <p className="text-center text-xs text-ink-soft">Бүх хөтөлбөрийг нэг QR кодоор, нэг удаа төлнө.</p>
        </aside>
      </div>
    </div>
  );
}
