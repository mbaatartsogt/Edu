import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { api } from '../../lib/api';
import { money, useUser } from '../../lib/user';
import Icon, { Coin } from '../../components/ui/Icon';
import { fmtDate } from './shared';

const nf = (n) => new Intl.NumberFormat('en-US').format(n);
const RING_TEXT = 'MindPoint · MindEdu Rewards · Learn it · Live it · '.repeat(6);
const TX_LABEL = { signup: 'Бүртгэлийн урамшуулал', earn_order: 'Төлбөрийн оноо', earn_reversal: 'Төлбөр буцаалт', redeem: 'Бэлэг авсан', refund: 'Оноо буцаалт', admin: 'Урамшуулал' };
const RD_STATUS = {
  pending: { label: 'Хүлээн авахад бэлэн', cls: 'bg-brand-yellow/25 text-[#8a6500]' },
  fulfilled: { label: 'Хүлээлгэн өгсөн', cls: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Цуцлагдсан', cls: 'bg-slate-200 text-slate-600' },
};

/** Зурагтай хүрээ — ирмэгээр нь MindPoint бичигтэй */
function Frame({ image, title }) {
  return (
    <div className="relative aspect-[4/3] w-full rounded-[30px] bg-gradient-to-br from-white via-[#E7EDF7] to-[#C9D4E6] p-[5%] shadow-[inset_0_2px_4px_rgba(255,255,255,.9)]">
      <svg viewBox="0 0 400 300" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        <path id="ring" d="M40,9 H360 A31,31 0 0 1 391,40 V260 A31,31 0 0 1 360,291 H40 A31,31 0 0 1 9,260 V40 A31,31 0 0 1 40,9 Z" fill="none" />
        <text fontSize="8.5" fontWeight="600" fill="#0A2A7A" fillOpacity=".55" letterSpacing=".6"><textPath href="#ring">{RING_TEXT}</textPath></text>
      </svg>
      <div className="relative grid h-full place-items-center overflow-hidden rounded-[20px] bg-gradient-to-b from-[#F3F8FF] to-[#D9E9FF]">
        {image ? <img src={image} alt={title} loading="lazy" className="h-full w-full object-contain p-[6%]" />
          : <span className="icon3d-y !h-16 !w-16"><Icon name="gift" className="h-8 w-8 text-brand-royal" /></span>}
      </div>
    </div>
  );
}

function RewardCard({ r, balance, onPick }) {
  const soldOut = r.stock !== null && r.stock <= 0;
  const short = r.pointsCost - balance;
  return (
    <motion.article layout whileHover={{ y: -6 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="group flex flex-col overflow-hidden rounded-[30px] bg-[#1B1F2A] text-white shadow-[0_24px_50px_-24px_rgba(0,0,0,.7)]">
      <div className="p-3 pb-0"><Frame image={r.image} title={r.title} /></div>
      <div className="grid flex-1 content-start gap-1.5 px-5 pb-4 pt-4">
        <h3 className="truncate text-lg font-bold" title={r.title}>{r.title}</h3>
        {r.description && <p className="line-clamp-1 text-sm font-medium text-white/85" title={r.description}>{r.description}</p>}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold">
          {r.stock !== null && !soldOut && r.stock <= 5 && <span className="text-brand-yellow">Үлдсэн {r.stock} ширхэг</span>}
          {!soldOut && short > 0 && <span className="text-white/60">{nf(short)} оноо дутуу</span>}
          {!soldOut && short <= 0 && <span className="text-emerald-300">Авах боломжтой</span>}
        </div>
      </div>
      <button onClick={() => onPick(r)} disabled={soldOut}
        className="flex items-center justify-center gap-2.5 bg-[#262B38] px-4 py-4 text-base font-extrabold transition group-hover:bg-brand-blue disabled:opacity-60 disabled:group-hover:bg-[#262B38]"
        aria-label={`${r.title} — ${r.pointsCost} оноогоор авах`}>
        <Coin className="h-7 w-7" />
        <span className="whitespace-nowrap tabular-nums">{nf(r.pointsCost)} Пойнт</span>
        {soldOut && <span className="ml-1 rounded-full bg-white/15 px-2 py-0.5 text-[.7rem]">Дууссан</span>}
      </button>
    </motion.article>
  );
}

function RedeemDialog({ reward, balance, onClose, onDone }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const enough = balance >= reward.pointsCost;

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !busy && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  async function confirm() {
    setBusy(true); setError('');
    try { const res = await api.redeem(reward.id); setResult(res); onDone(res); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-4">
      <motion.div className="absolute inset-0 bg-brand-navy/60 backdrop-blur-sm" onClick={() => !busy && onClose()} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div role="dialog" aria-modal="true" aria-labelledby="rd-title" className="relative w-full max-w-md overflow-hidden rounded-4xl bg-white"
        initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92 }}>
        {result ? (
          <div className="grid justify-items-center gap-4 p-7 text-center">
            <motion.span className="icon3d-y !h-16 !w-16" initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 12 }}>
              <Icon name="gift" className="h-8 w-8 text-brand-royal" />
            </motion.span>
            <h2 id="rd-title" className="text-2xl font-extrabold">Баяр хүргэе!</h2>
            <p className="text-ink-soft"><b className="text-ink">{reward.title}</b> бэлгийг авлаа. Доорх кодыг салбартаа үзүүлж бэлгээ хүлээн авна уу.</p>
            <p className="rounded-2xl border-2 border-dashed border-brand-blue bg-brand-mist px-6 py-3 font-mono text-2xl font-black tracking-[.2em] text-brand-royal">{result.redemption.code}</p>
            <p className="text-sm text-ink-soft">Үлдсэн оноо: <b className="text-ink">{nf(result.balance)}</b></p>
            <button onClick={onClose} className="btn-blue w-full">Ойлголоо</button>
          </div>
        ) : (
          <div className="grid gap-5 p-6">
            <div className="flex items-center gap-4">
              <div className="w-28 shrink-0"><Frame image={reward.image} title={reward.title} /></div>
              <div className="min-w-0">
                <h2 id="rd-title" className="text-xl font-extrabold">{reward.title}</h2>
                {reward.description && <p className="mt-1 text-sm text-ink-soft">{reward.description}</p>}
              </div>
            </div>
            <dl className="grid gap-2 rounded-2xl bg-brand-mist/70 p-4 text-sm">
              <div className="flex justify-between"><dt className="text-ink-soft">Таны оноо</dt><dd className="font-bold tabular-nums">{nf(balance)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-soft">Бэлгийн үнэ</dt><dd className="font-bold tabular-nums">− {nf(reward.pointsCost)}</dd></div>
              <div className="flex justify-between border-t border-line pt-2"><dt className="font-bold">Үлдэх оноо</dt>
                <dd className={`font-black tabular-nums ${enough ? '' : 'text-red-600'}`}>{nf(balance - reward.pointsCost)}</dd></div>
            </dl>
            {!enough && <p className="rounded-xl bg-brand-yellow/15 px-4 py-3 text-sm font-semibold">{nf(reward.pointsCost - balance)} оноо дутуу байна. Сургалтын төлбөр төлөх бүрт оноо нэмэгдэнэ.</p>}
            {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
            <div className="flex gap-3">
              <button onClick={confirm} disabled={!enough || busy} className="btn-blue flex-1">{busy ? 'Түр хүлээнэ үү…' : 'Оноогоор авах'}</button>
              <button onClick={onClose} disabled={busy} className="rounded-full border border-line px-6 font-bold">Болих</button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default function Points() {
  const { refresh } = useUser();
  const reduce = useReducedMotion();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('rewards');
  const [picked, setPicked] = useState(null);

  const load = () => api.myPoints().then(setData).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const nextReward = useMemo(() => {
    if (!data) return null;
    return [...data.rewards].filter((r) => r.pointsCost > data.balance && (r.stock === null || r.stock > 0)).sort((a, b) => a.pointsCost - b.pointsCost)[0] ?? null;
  }, [data]);

  if (error) return <p role="alert" className="rounded-2xl bg-red-50 p-4 font-semibold text-red-700">{error}</p>;
  if (!data) return <div className="h-[600px] animate-pulse rounded-4xl bg-white" />;

  const progress = nextReward ? Math.min(100, Math.round((data.balance / nextReward.pointsCost) * 100)) : 100;

  return (
    <div className="grid gap-8">
      {/* Онооны үлдэгдэл */}
      <section className="bg-grid-blue relative overflow-hidden rounded-4xl p-6 text-white sm:p-10" aria-labelledby="bal-title">
        <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full border-[22px] border-brand-yellow" />
        <div className="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <div className="grid gap-2">
            <p id="bal-title" className="text-sm font-extrabold uppercase tracking-[.16em] text-white/80">Миний MindPoint</p>
            <div className="flex items-center gap-4">
              <motion.span initial={reduce ? false : { rotateY: 180, scale: 0.6 }} animate={{ rotateY: 0, scale: 1 }} transition={{ duration: 0.8 }}>
                <Coin className="h-16 w-16 drop-shadow-lg sm:h-20 sm:w-20" />
              </motion.span>
              <p className="text-[clamp(3rem,9vw,5.5rem)] font-black leading-none tabular-nums">{nf(data.balance)}</p>
            </div>
            {nextReward && (
              <div className="mt-2 grid max-w-md gap-2">
                <p className="text-sm text-white/90"><b>{nextReward.title}</b> авахад <b>{nf(nextReward.pointsCost - data.balance)}</b> оноо дутуу</p>
                <div className="h-2.5 overflow-hidden rounded-full bg-white/20">
                  <motion.div className="h-full rounded-full bg-brand-yellow" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1, delay: 0.3 }} />
                </div>
              </div>
            )}
          </div>
          <ul className="grid gap-2 rounded-3xl bg-white/10 p-5 text-sm backdrop-blur" aria-label="Оноо цуглуулах арга">
            <li className="text-xs font-extrabold uppercase tracking-[.14em] text-white/75">Оноо хэрхэн цуглуулах вэ</li>
            {data.rules.per1000 > 0 && <li className="flex gap-2"><Coin className="h-5 w-5 shrink-0" /> Төлбөрийн {money(1000)} тутамд {data.rules.per1000} оноо</li>}
            {data.rules.signup > 0 && <li className="flex gap-2"><Coin className="h-5 w-5 shrink-0" /> Бүртгэл баталгаажуулахад {data.rules.signup} оноо</li>}
            <li className="flex gap-2"><Coin className="h-5 w-5 shrink-0" /> Олимпиад, идэвхтэй оролцоонд багшаас урамшуулал</li>
          </ul>
        </div>
      </section>

      <div className="flex flex-wrap gap-2" role="tablist">
        {[['rewards', 'Бэлэгнүүд'], ['mine', `Миний бэлэг (${data.redemptions.length})`], ['history', 'Онооны түүх']].map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`rounded-full px-5 py-2.5 text-sm font-bold transition ${tab === k ? 'bg-brand-navy text-white' : 'border border-line bg-white hover:border-brand-blue'}`}>{label}</button>
        ))}
      </div>

      {tab === 'rewards' && (
        <section className="relative overflow-hidden rounded-4xl bg-[radial-gradient(ellipse_at_30%_0%,#2C7BFF_0%,#0B3FB8_45%,#06123A_100%)] p-4 sm:p-6" aria-label="Бэлэгнүүд">
          {!data.rewards.length ? (
            <p className="p-10 text-center font-semibold text-white">Бэлэг удахгүй нэмэгдэнэ.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {data.rewards.map((r) => <RewardCard key={r.id} r={r} balance={data.balance} onPick={setPicked} />)}
            </div>
          )}
        </section>
      )}

      {tab === 'mine' && (
        !data.redemptions.length ? (
          <div className="grid justify-items-center gap-2 rounded-3xl border border-dashed border-line bg-white px-6 py-12 text-center">
            <Icon name="gift" className="h-8 w-8 text-brand-sky" />
            <p className="font-extrabold">Одоогоор бэлэг аваагүй байна</p>
            <button onClick={() => setTab('rewards')} className="text-sm font-bold text-brand-blue hover:underline">Бэлэг сонгох</button>
          </div>
        ) : (
          <ul className="grid gap-3">
            {data.redemptions.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-4 rounded-3xl border border-line bg-white p-4">
                <div className="w-20 shrink-0"><Frame image={r.rewardImage} title={r.rewardTitle} /></div>
                <div className="min-w-0 flex-1 basis-48">
                  <p className="font-extrabold">{r.rewardTitle}</p>
                  <p className="text-xs text-ink-soft">{fmtDate(r.createdAt)} · {nf(r.points)} оноо</p>
                </div>
                <span className="rounded-xl bg-brand-mist px-3 py-1.5 font-mono font-black tracking-widest text-brand-royal">{r.code}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${RD_STATUS[r.status].cls}`}>{RD_STATUS[r.status].label}</span>
              </li>
            ))}
          </ul>
        )
      )}

      {tab === 'history' && (
        <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-white">
          {data.history.length === 0 && <li className="p-8 text-center text-ink-soft">Онооны түүх хоосон байна.</li>}
          {data.history.map((t) => (
            <li key={t.id} className="flex items-center gap-4 px-5 py-4">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${t.amount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                <Icon name={t.amount > 0 ? 'plus' : 'gift'} className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold">{TX_LABEL[t.kind] ?? t.kind}</p>
                <p className="truncate text-xs text-ink-soft">{t.reason} · {fmtDate(t.createdAt)}</p>
              </div>
              <p className={`text-lg font-black tabular-nums ${t.amount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{t.amount > 0 ? '+' : ''}{nf(t.amount)}</p>
            </li>
          ))}
        </ul>
      )}

      <p className="text-center text-sm text-ink-soft">Оноо нэмэгдүүлэх хамгийн хялбар арга: <Link to="/account/programs" className="font-bold text-brand-blue hover:underline">хөтөлбөрөө сонгоод төлбөрөө төлөх</Link></p>

      <AnimatePresence>
        {picked && (
          <RedeemDialog key="redeem" reward={picked} balance={data.balance} onClose={() => setPicked(null)}
            onDone={() => { load(); refresh().catch(() => {}); }} />
        )}
      </AnimatePresence>
    </div>
  );
}
