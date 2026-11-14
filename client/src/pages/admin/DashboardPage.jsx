import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import Icon from '../../components/ui/Icon';

// Нэг цувааны өнгө (брэндийн цэнхэр — validate_palette-аар шалгасан). Улирлын загвараас хамаарахгүй тогтмол.
const SERIES = '#0A6CF5';
const GRID = '#E4EAF3';
const RANGES = [7, 30, 90];

const nf = (n) => new Intl.NumberFormat('en-US').format(Math.round(n || 0));
const compact = (n) => (n >= 1e6 ? `${+(n / 1e6).toFixed(1)}M` : n >= 1e4 ? `${+(n / 1e3).toFixed(1)}K` : nf(n));
const money = (n) => `${nf(n)}₮`;
const moneyCompact = (n) => (n >= 1e6 ? `${+(n / 1e6).toFixed(1)} сая₮` : n >= 1e4 ? `${+(n / 1e3).toFixed(0)} мянга₮` : money(n));
const moneyAxis = (n) => (n >= 1e6 ? `${+(n / 1e6).toFixed(1)}M₮` : n >= 1e3 ? `${+(n / 1e3).toFixed(0)}K₮` : `${nf(n)}₮`);
const WD = ['Ня', 'Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя'];
const parseDay = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const shortDay = (s) => { const d = parseDay(s); return `${d.getMonth() + 1}/${d.getDate()}`; };
const longDay = (s) => { const d = parseDay(s); return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} (${WD[d.getDay()]})`; };

const PAGE_NAMES = {
  '/': 'Нүүр хуудас', '/login': 'Нэвтрэх / бүртгүүлэх', '/account': 'Миний булан', '/account/programs': 'Хөтөлбөр сонгох',
  '/account/cart': 'Сагс', '/account/orders': 'Миний захиалгууд', '/account/orders/:id': 'Төлбөрийн хуудас',
  '/account/points': 'MindPoint', '/account/lessons': 'Видео хичээл', '/account/lessons/:id': 'Видео хичээл үзэх',
  '/account/checkout/:id': 'Захиалга', '/verify-email': 'И-мэйл баталгаажуулах', '/forgot-password': 'Нууц үг сэргээх', '/reset-password': 'Нууц үг солих',
};
const SOURCE_NAMES = { direct: 'Шууд (хаяг бичиж, хавчуурга)', google: 'Google хайлт', 'facebook.com': 'Facebook', 'instagram.com': 'Instagram' };
const DEVICE_NAMES = { mobile: 'Гар утас', desktop: 'Компьютер', tablet: 'Таблет' };

/** 0-ээс эхэлсэн цэвэр тоон хуваарь */
function niceScale(max, count = 4) {
  if (max <= 0) return { top: count, step: 1 };
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
  const st = Math.max(step, Number.isInteger(max) && max < count ? 1 : step);
  return { top: Math.ceil(max / st) * st, step: st };
}

function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    setW(Math.round(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/**
 * Өдөр тутмын нэг цуваат график.
 * kind: 'area' (шугам + 10% будалт, crosshair) | 'column' (≤24px, дээд талдаа 4px бөөрөнхий)
 */
function TimeChart({ data, value, kind = 'area', height = 240, fmtAxis = compact, tooltip, label }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const n = data.length;
  const vals = data.map(value);
  const { top, step } = niceScale(Math.max(...vals, 0));
  // Зүүн зай — хамгийн урт шошгонд тааруулна (тайрагдахгүй)
  const m = { l: Math.max(30, String(fmtAxis(top)).length * 7 + 14), r: 14, t: 14, b: 30 };
  const iw = Math.max(0, width - m.l - m.r), ih = height - m.t - m.b;
  const y = (v) => m.t + ih - (v / top) * ih;
  const band = n ? iw / n : 0;
  const x = kind === 'column' ? (i) => m.l + band * i + band / 2 : (i) => m.l + (n > 1 ? (iw * i) / (n - 1) : iw / 2);
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 64))));

  const pick = (clientX) => {
    const rect = ref.current.getBoundingClientRect();
    const px = clientX - rect.left - m.l;
    const i = kind === 'column' ? Math.floor(px / band) : Math.round((px / iw) * (n - 1));
    setHover(Math.min(n - 1, Math.max(0, i)));
  };
  const onKey = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); setHover((h) => Math.min(n - 1, (h ?? -1) + 1)); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); setHover((h) => Math.max(0, (h ?? n) - 1)); }
    if (e.key === 'Escape') setHover(null);
  };

  const line = vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const area = n ? `${line}L${x(n - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z` : '';
  const bw = Math.min(24, Math.max(2, band - 2));
  const col = (i, v) => {
    const h = y(0) - y(v), r = Math.min(4, h, bw / 2), x0 = x(i) - bw / 2, y0 = y(v);
    if (h <= 0) return '';
    return `M${x0},${y(0)}V${y0 + r}Q${x0},${y0} ${x0 + r},${y0}H${x0 + bw - r}Q${x0 + bw},${y0} ${x0 + bw},${y0 + r}V${y(0)}Z`;
  };

  const tipLeft = hover === null ? 0 : x(hover);
  const flip = tipLeft > width - 190;

  return (
    <div ref={ref} className="relative w-full select-none" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={label} tabIndex={0} onKeyDown={onKey}
          onPointerMove={(e) => pick(e.clientX)} onPointerLeave={() => setHover(null)} onBlur={() => setHover(null)}
          className="absolute inset-0 touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40 rounded-xl">
          <g className="text-ink-soft" fontSize="11" fontWeight="600">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={m.l} x2={width - m.r} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth="1" shapeRendering="crispEdges" />
                <text x={m.l - 8} y={y(t)} dy="0.32em" textAnchor="end" fill="currentColor" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtAxis(t)}</text>
              </g>
            ))}
            {data.map((d, i) => ((n - 1 - i) % every === 0 ? (
              <text key={d.day} x={x(i)} y={height - 8} textAnchor="middle" fill="currentColor">{shortDay(d.day)}</text>
            ) : null))}
          </g>
          {kind === 'area' ? (
            <>
              <path d={area} fill={SERIES} fillOpacity="0.1" />
              <path d={line} fill="none" stroke={SERIES} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              {n > 0 && hover === null && <circle cx={x(n - 1)} cy={y(vals[n - 1])} r="4" fill={SERIES} stroke="#fff" strokeWidth="2" />}
              {hover !== null && (
                <>
                  <line x1={x(hover)} x2={x(hover)} y1={m.t} y2={y(0)} stroke="#9AA8BF" strokeWidth="1" />
                  <circle cx={x(hover)} cy={y(vals[hover])} r="5" fill={SERIES} stroke="#fff" strokeWidth="2" />
                </>
              )}
            </>
          ) : (
            data.map((d, i) => (
              <g key={d.day}>
                {hover === i && <rect x={m.l + band * i} y={m.t} width={band} height={ih} fill="#0A6CF5" fillOpacity="0.06" />}
                <path d={col(i, vals[i])} fill={SERIES} fillOpacity={hover === null || hover === i ? 1 : 0.45} />
              </g>
            ))
          )}
          <line x1={m.l} x2={width - m.r} y1={y(0)} y2={y(0)} stroke="#C9D3E3" strokeWidth="1" shapeRendering="crispEdges" />
        </svg>
      )}
      {hover !== null && width > 0 && (
        <div role="status" className="pointer-events-none absolute z-10 min-w-[10rem] rounded-2xl bg-brand-navy px-3.5 py-2.5 text-xs text-white shadow-xl"
          style={{ left: tipLeft, top: 4, transform: `translateX(${flip ? 'calc(-100% - 12px)' : '12px'})` }}>
          <p className="mb-1 font-bold text-white/70">{longDay(data[hover].day)}</p>
          {tooltip(data[hover]).map(([k, v, main]) => (
            <p key={k} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5">{main && <span className="h-2 w-2 rounded-full" style={{ background: SERIES }} />}{k}</span>
              <b className="tabular-nums">{v}</b>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function Delta({ cur, prev, days }) {
  if (!prev && !cur) return <p className="text-xs font-semibold text-ink-soft">Өмнөх {days} хоногтой адил</p>;
  if (!prev) return <p className="text-xs font-semibold text-ink-soft">Өмнөх {days} хоногт 0 байсан</p>;
  const pct = Math.round(((cur - prev) / prev) * 100);
  const up = pct > 0, flat = pct === 0;
  return (
    <p className={`flex items-center gap-1 text-xs font-bold ${flat ? 'text-ink-soft' : up ? 'text-emerald-700' : 'text-red-700'}`}>
      {!flat && <Icon name="up" className={`h-3.5 w-3.5 ${up ? '' : 'rotate-180'}`} strokeWidth={3} />}
      {flat ? '0%' : `${up ? '+' : ''}${pct}%`} <span className="font-semibold text-ink-soft">өмнөх {days} хоногоос</span>
    </p>
  );
}

function Tile({ label, value, children, icon }) {
  return (
    <div className="grid gap-1.5 rounded-3xl border border-line bg-white p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink-soft"><Icon name={icon} className="h-4 w-4" />{label}</p>
      <p className="text-3xl font-black">{value}</p>
      {children}
    </div>
  );
}

function Card({ title, sub, children, action }) {
  return (
    <section className="grid min-w-0 content-start gap-4 rounded-3xl border border-line bg-white p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-extrabold">{title}</h2>
          {sub && <p className="text-sm text-ink-soft">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Нэг өнгийн хэвтээ мөрүүд (хэмжээ) */
function BarList({ rows, empty }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  if (!rows.length) return <p className="py-6 text-center text-sm font-semibold text-ink-soft">{empty}</p>;
  return (
    <ul className="grid gap-3">
      {rows.map((r) => (
        <li key={r.key} className="grid gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-semibold" title={r.hint}>{r.label}</span>
            <span className="shrink-0 font-bold tabular-nums">{nf(r.value)}{r.extra && <span className="ml-1.5 font-semibold text-ink-soft">{r.extra}</span>}</span>
          </div>
          <div className="h-2 rounded-full bg-brand-mist">
            <div className="h-full rounded-full" style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, background: SERIES }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function DashboardPage() {
  const nav = useNavigate();
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [table, setTable] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () => api.analytics(days).then((d) => alive && (setData(d), setError('')))
      .catch((e) => alive && (e.status === 401 ? nav('/admin/login', { replace: true }) : setError(e.message)));
    load();
    const t = setInterval(load, 60_000); // минут тутам шинэчилнэ
    return () => { alive = false; clearInterval(t); };
  }, [days, nav]);

  const s = data?.series ?? [];
  const t = data?.totals;
  const avgViews = useMemo(() => (t?.visitors ? (t.views / t.visitors).toFixed(1) : '0'), [t]);
  const peak = useMemo(() => s.reduce((b, d) => (d.visitors > (b?.visitors ?? -1) ? d : b), null), [s]);
  const devTotal = (data?.devices ?? []).reduce((a, d) => a + d.visitors, 0);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Хянах самбар</h1>
          <p className="text-ink-soft">Сайтын хандалт, хэрэглэгч, орлогын өдөр тутмын тойм</p>
        </div>
        <div className="flex rounded-full bg-white p-1 shadow-sm" role="group" aria-label="Хугацаа">
          {RANGES.map((r) => (
            <button key={r} onClick={() => setDays(r)} aria-pressed={days === r}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${days === r ? 'bg-brand-navy text-white' : 'text-ink-soft hover:text-ink'}`}>
              {r} хоног
            </button>
          ))}
        </div>
      </div>

      {error && <p role="alert" className="rounded-2xl bg-red-50 p-4 font-semibold text-red-700">{error}</p>}

      {!data ? (
        <div className="grid gap-4"><div className="h-28 animate-pulse rounded-3xl bg-white" /><div className="h-80 animate-pulse rounded-3xl bg-white" /></div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-3xl bg-brand-navy px-5 py-4 text-white">
            <p className="flex items-center gap-2.5 font-bold">
              <span className="relative flex h-3 w-3">
                {data.now.online > 0 && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:hidden" />}
                <span className={`relative inline-flex h-3 w-3 rounded-full ${data.now.online ? 'bg-emerald-400' : 'bg-white/40'}`} />
              </span>
              Яг одоо сайтад: <span className="text-xl font-black">{nf(data.now.online)}</span> хүн
            </p>
            <p className="text-sm text-white/80">Өнөөдөр <b className="text-white">{nf(data.now.todayVisitors)}</b> зочин · <b className="text-white">{nf(data.now.todayViews)}</b> хуудас үзэлт</p>
            <p className="text-sm text-white/80 sm:ml-auto">Нийт бүртгэлтэй хэрэглэгч: <b className="text-white">{nf(data.totalUsers)}</b></p>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Tile label="Зочид" icon="users" value={compact(t.visitors)}><Delta cur={t.visitors} prev={t.visitorsPrev} days={days} /></Tile>
            <Tile label="Хуудас үзэлт" icon="eye" value={compact(t.views)}><Delta cur={t.views} prev={t.viewsPrev} days={days} /></Tile>
            <Tile label="Шинэ хэрэглэгч" icon="user" value={nf(t.newUsers)}><Delta cur={t.newUsers} prev={t.newUsersPrev} days={days} /></Tile>
            <Tile label="Орлого" icon="card" value={moneyCompact(t.revenue)}><Delta cur={t.revenue} prev={t.revenuePrev} days={days} /></Tile>
          </div>

          <Card title="Өдөр тутмын зочид" sub={`Сүүлийн ${days} хоног · нэг хөтөч өдөрт нэг удаа тоологдоно · дундажаар ${avgViews} хуудас үзсэн${peak?.visitors ? ` · оргил: ${shortDay(peak.day)} (${nf(peak.visitors)})` : ''}`}
            action={<button onClick={() => setTable((x) => !x)} className="rounded-full bg-brand-mist px-3 py-1.5 text-xs font-bold text-brand-royal hover:bg-brand-sky/30">{table ? 'График' : 'Хүснэгтээр харах'}</button>}>
            {table ? (
              <div className="max-h-80 overflow-auto rounded-2xl border border-line">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-brand-mist text-left text-xs uppercase tracking-wider text-ink-soft">
                    <tr><th className="px-3 py-2">Өдөр</th><th className="px-3 py-2 text-right">Зочид</th><th className="px-3 py-2 text-right">Хуудас</th><th className="px-3 py-2 text-right">Шинэ хэрэглэгч</th><th className="px-3 py-2 text-right">Төлбөр</th><th className="px-3 py-2 text-right">Орлого</th></tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {[...s].reverse().map((d) => (
                      <tr key={d.day} className="border-t border-line">
                        <td className="px-3 py-2 font-semibold">{longDay(d.day)}</td>
                        <td className="px-3 py-2 text-right">{nf(d.visitors)}</td><td className="px-3 py-2 text-right">{nf(d.views)}</td>
                        <td className="px-3 py-2 text-right">{nf(d.newUsers)}</td><td className="px-3 py-2 text-right">{nf(d.orders)}</td>
                        <td className="px-3 py-2 text-right">{money(d.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <TimeChart data={s} value={(d) => d.visitors} kind="area" height={280} label={`Сүүлийн ${days} хоногийн өдөр тутмын зочид`}
                tooltip={(d) => [['Зочид', nf(d.visitors), true], ['Хуудас үзэлт', nf(d.views)], ['Шинэ хэрэглэгч', nf(d.newUsers)]]} />
            )}
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Шинэ бүртгүүлсэн хэрэглэгч" sub={`Өдөрт · нийт ${nf(t.newUsers)}`}
              action={<Link to="/admin/users" className="text-xs font-bold text-brand-blue hover:underline">Хэрэглэгчид</Link>}>
              <TimeChart data={s} value={(d) => d.newUsers} kind="column" height={220} label="Өдөр тутмын шинэ хэрэглэгч"
                tooltip={(d) => [['Шинэ хэрэглэгч', nf(d.newUsers), true], ['Зочид', nf(d.visitors)]]} />
            </Card>
            <Card title="Орлого" sub={`Төлөгдсөн захиалга · нийт ${money(t.revenue)} (${nf(t.orders)} захиалга)`}
              action={<Link to="/admin/orders" className="text-xs font-bold text-brand-blue hover:underline">Захиалгууд</Link>}>
              <TimeChart data={s} value={(d) => d.revenue} kind="column" height={220} fmtAxis={moneyAxis} label="Өдөр тутмын орлого"
                tooltip={(d) => [['Орлого', money(d.revenue), true], ['Төлсөн захиалга', nf(d.orders)]]} />
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card title="Их үзсэн хуудсууд" sub="Хуудас үзэлт (зочид)">
              <BarList empty="Мэдээлэл алга" rows={data.topPages.map((p) => ({ key: p.path, label: PAGE_NAMES[p.path] ?? p.path, hint: p.path, value: p.views, extra: `(${nf(p.visitors)})` }))} />
            </Card>
            <Card title="Хаанаас ирсэн" sub="Зочдын тоо">
              <BarList empty="Мэдээлэл алга" rows={data.sources.map((r) => ({ key: r.source, label: SOURCE_NAMES[r.source] ?? r.source, value: r.visitors }))} />
            </Card>
            <Card title="Төхөөрөмж" sub="Зочдын тоо">
              <BarList empty="Мэдээлэл алга" rows={data.devices.map((d) => ({ key: d.device, label: DEVICE_NAMES[d.device] ?? d.device, value: d.visitors, extra: devTotal ? `${Math.round((d.visitors / devTotal) * 100)}%` : '' }))} />
            </Card>
          </div>
          <p className="text-xs text-ink-soft">Өдрийг {data.tz} цагаар тоолно. Админ хуудас, хайлтын робот тоологдохгүй. IP хаяг хадгалахгүй. График минут тутам шинэчлэгдэнэ.</p>
        </>
      )}
    </div>
  );
}
