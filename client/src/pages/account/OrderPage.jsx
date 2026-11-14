import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { api } from '../../lib/api';
import { money, useUser } from '../../lib/user';
import Icon, { Coin } from '../../components/ui/Icon';
import { StatusPill, fmtDate } from './shared';
import { orderItems } from './Orders';

const POLL_MS = 4000;
const POLL_LIMIT_MS = 15 * 60_000;

function Details({ o }) {
  const items = orderItems(o);
  const rows = [
    ['Захиалгын дугаар', o.orderNo],
    ['Огноо', fmtDate(o.createdAt)],
    o.paidAt && ['Төлсөн', fmtDate(o.paidAt)],
  ].filter(Boolean);
  return (
    <div className="grid gap-4 text-sm">
      <ul className="grid gap-2">
        {items.map((it, i) => (
          <li key={i} className="flex items-start justify-between gap-3 rounded-2xl bg-brand-mist/60 px-4 py-3">
            <div className="min-w-0">
              <p className="font-extrabold">{it.programTitle}{it.programAge ? <span className="font-semibold text-ink-soft"> · {it.programAge} нас</span> : null}</p>
              <p className="text-ink-soft">{it.childName}, {it.childAge} нас{it.branchName ? ` · ${it.branchName}` : ''}</p>
            </div>
            <span className="shrink-0 font-bold tabular-nums">{money(it.amount)}</span>
          </li>
        ))}
      </ul>
      <dl className="grid gap-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4"><dt className="text-ink-soft">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>
        ))}
        <div className="mt-1 flex items-end justify-between gap-4 border-t border-dashed border-line pt-4">
          <dt className="font-bold">Нийт дүн</dt><dd className="text-2xl font-black tabular-nums">{money(o.amount)}</dd>
        </div>
      </dl>
    </div>
  );
}

function PaidView({ o, onShown }) {
  const reduce = useReducedMotion();
  useEffect(() => { onShown?.().catch(() => {}); }, [onShown]); // онооны үлдэгдэл шинэчлэгдэнэ
  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
      className="mx-auto grid w-full max-w-lg justify-items-center gap-5 rounded-4xl bg-white p-8 text-center shadow-card">
      <motion.span className="check3d !h-20 !w-20 !rounded-[24px]" initial={reduce ? false : { scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 12, delay: 0.1 }}>
        <svg viewBox="0 0 24 24" className="h-11 w-11" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.4, duration: 0.5 }} />
        </svg>
      </motion.span>
      <div>
        <h1 className="text-3xl font-extrabold">Төлбөр амжилттай!</h1>
        <p className="mt-1 text-ink-soft">{o.childName}-ийн бүртгэл баталгаажлаа. Хичээлийн хуваарийн мэдээллийг манай ажилтан утсаар өгнө.</p>
      </div>
      <Link to="/account/points" className="flex items-center gap-2 rounded-full bg-brand-yellow/20 px-4 py-2 text-sm font-bold text-[#7a5a00] hover:bg-brand-yellow/30">
        <Coin className="h-6 w-6" /> MindPoint оноо нэмэгдлээ — бэлэг үзэх
      </Link>
      <div className="w-full rounded-3xl bg-brand-mist/60 p-5 text-left"><Details o={o} /></div>
      <Link to="/account" className="btn-blue w-full">Миний булан руу</Link>
    </motion.div>
  );
}

export default function OrderPage() {
  const { id } = useParams();
  const { refresh } = useUser();
  const [o, setO] = useState(null);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [notice, setNotice] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const started = useRef(Date.now());

  const load = useCallback(async (manual = false) => {
    if (manual) { setChecking(true); setNotice(''); }
    try {
      const next = await api.order(id);
      setO(next);
      if (manual && next.status === 'pending') setNotice('Төлбөр хараахан орж ирээгүй байна. Төлсний дараа хэдэн секунд хүлээгээд дахин шалгана уу.');
    } catch (e) { setError(e.message); }
    finally { if (manual) setChecking(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Төлбөр хүлээж байх үед автоматаар шалгана
  const status = o?.status, mode = o?.paymentMode, invoiceId = o?.invoiceId;
  useEffect(() => {
    if (status !== 'pending' || mode === 'demo' || !invoiceId) return;
    const t = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - started.current > POLL_LIMIT_MS) return clearInterval(t);
      load();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [status, mode, invoiceId, load]);

  async function act(fn) {
    setChecking(true); setNotice('');
    try { setO({ ...(await fn(id)), paymentMode: o.paymentMode }); }
    catch (e) { setNotice(e.message); }
    finally { setChecking(false); }
  }

  if (error) return <p role="alert" className="rounded-2xl bg-red-50 p-4 font-semibold text-red-700">{error}</p>;
  if (!o) return <div className="mx-auto h-[520px] max-w-3xl animate-pulse rounded-4xl bg-white" />;
  if (o.status === 'paid') return <PaidView o={o} onShown={refresh} />;

  const pay = o.payment;
  const isDemo = o.paymentMode === 'demo';

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6">
      <Link to="/account/orders" className="w-fit text-sm font-bold text-brand-blue hover:underline">← Миний захиалгууд</Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="h2">Төлбөр <b className="font-extrabold">төлөх</b></h1>
        <StatusPill status={o.status} />
      </div>

      {o.status === 'cancelled' ? (
        <div className="grid gap-4 rounded-4xl bg-white p-6 sm:p-8">
          <p className="font-bold">Энэ захиалга цуцлагдсан байна.</p>
          <Details o={o} />
          <Link to="/account/programs" className="btn-blue">Шинээр хөтөлбөр сонгох</Link>
        </div>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <section className="grid gap-5 rounded-4xl bg-white p-6 shadow-card sm:p-8" aria-labelledby="pay-title">
            <div>
              <h2 id="pay-title" className="text-xl font-extrabold">QPay-аар төлөх</h2>
              <p className="text-sm text-ink-soft">Банкны апп-аараа QR кодыг уншуулах эсвэл утаснаас доорх банкаа сонгоно уу.</p>
            </div>

            {isDemo && (
              <p className="rounded-2xl border-2 border-dashed border-brand-yellow bg-brand-yellow/10 px-4 py-3 text-sm font-semibold text-[#7a5a00]">
                Туршилтын горим: жинхэнэ төлбөр хийгдэхгүй. Админ QPay-ийн мэдээллээ оруулсны дараа жинхэнэ QR гарна.
              </p>
            )}

            {!pay ? (
              <div className="grid justify-items-center gap-3 rounded-3xl bg-brand-mist p-8 text-center">
                <p className="font-bold">Нэхэмжлэх үүсгэж чадсангүй.</p>
                <button onClick={() => act(api.retryInvoice)} disabled={checking} className="btn-blue !py-3">Дахин оролдох</button>
              </div>
            ) : (
              <>
                <div className="mx-auto grid w-full max-w-[260px] place-items-center rounded-3xl border-2 border-line bg-white p-4">
                  {pay.qrImage ? (
                    <img src={pay.qrImage} alt={`QPay QR код, ${money(o.amount)}`} className="aspect-square w-full" />
                  ) : (
                    <div className="grid aspect-square w-full place-items-center rounded-2xl bg-[repeating-linear-gradient(45deg,#eaf3ff_0_10px,#fff_10px_20px)] text-center">
                      <span className="rounded-xl bg-white px-3 py-2 text-sm font-extrabold text-brand-royal shadow">DEMO QR</span>
                    </div>
                  )}
                  <p className="mt-3 text-2xl font-black tabular-nums">{money(o.amount)}</p>
                </div>

                {pay.urls?.length > 0 && (
                  <div className="grid gap-2">
                    <p className="text-sm font-bold">Утсан дээрээ банкны апп сонгох</p>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {pay.urls.map((u) => (
                        <a key={u.name + u.link} href={u.link} className="grid justify-items-center gap-1.5 rounded-2xl border border-line p-2.5 text-center transition hover:border-brand-blue hover:bg-brand-mist">
                          <img src={u.logo} alt="" className="h-10 w-10 rounded-xl object-contain" loading="lazy" />
                          <span className="line-clamp-2 text-[.68rem] font-semibold leading-tight">{u.description || u.name}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <AnimatePresence>
                  {notice && <motion.p key="notice" role="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-xl bg-brand-mist px-4 py-3 text-sm font-semibold">{notice}</motion.p>}
                </AnimatePresence>

                <div className="grid gap-2">
                  {isDemo ? (
                    <button onClick={() => act(api.demoPay)} disabled={checking} className="btn-yellow">Төлсөн гэж тооцох (туршилт)</button>
                  ) : (
                    <button onClick={() => load(true)} disabled={checking} className="btn-blue">
                      <Icon name="refresh" className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} /> {checking ? 'Шалгаж байна…' : 'Төлбөр шалгах'}
                    </button>
                  )}
                  {!isDemo && <p className="text-center text-xs text-ink-soft">Төлбөр ормогц энэ хуудас автоматаар шинэчлэгдэнэ.</p>}
                </div>
              </>
            )}

            <div className="border-t border-line pt-4 text-center">
              {confirmCancel ? (
                <span className="inline-flex flex-wrap items-center justify-center gap-2 text-sm">
                  Захиалгыг цуцлах уу?
                  <button onClick={() => act(api.cancelOrder)} className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-bold text-white">Тийм, цуцлах</button>
                  <button onClick={() => setConfirmCancel(false)} className="rounded-full border border-line px-3 py-1.5 text-xs font-bold">Үгүй</button>
                </span>
              ) : (
                <button onClick={() => setConfirmCancel(true)} className="text-sm font-semibold text-ink-soft hover:text-red-600">Захиалга цуцлах</button>
              )}
            </div>
          </section>

          <aside className="grid gap-4 rounded-4xl bg-white p-6 sm:p-8">
            <h2 className="text-lg font-extrabold">Захиалгын мэдээлэл</h2>
            <Details o={o} />
          </aside>
        </div>
      )}
    </div>
  );
}
