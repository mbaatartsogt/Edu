import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import { money } from '../../lib/user';
import { useCart } from '../../lib/cart';
import { programThemes, themeCls } from '../../data/themes';
import { Stagger, StaggerItem } from '../../components/ui/motion';
import Icon from '../../components/ui/Icon';

export const fmtDay = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

/** Хөтөлбөрийн үзэх эрхийн төлөв */
export function accessState(access, graceDays = 0) {
  if (!access) return { key: 'none', label: 'Төлбөр төлөөгүй', cls: 'bg-slate-100 text-slate-600' };
  if (!access.active) return { key: 'expired', label: `Хугацаа дууссан · ${fmtDay(access.until)}`, cls: 'bg-red-50 text-red-700' };
  if (access.oneTime) return { key: 'active', label: 'Үзэх эрхтэй', cls: 'bg-emerald-50 text-emerald-700' };
  const left = Math.ceil((new Date(access.until) - Date.now()) / 86_400_000);
  if (left < 0) return { key: 'grace', label: `Төлбөрийн хугацаа дууссан — ${graceDays + left > 0 ? `${graceDays + left} хоногийн дотор` : 'өнөөдөр'} сунгана уу`, cls: 'bg-brand-yellow/25 text-[#8a6500]' };
  if (left <= 7) return { key: 'soon', label: `${left} хоног үлдсэн · ${fmtDay(access.until)} хүртэл`, cls: 'bg-brand-yellow/25 text-[#8a6500]' };
  return { key: 'active', label: `Идэвхтэй · ${fmtDay(access.until)} хүртэл`, cls: 'bg-emerald-50 text-emerald-700' };
}

/** Хөтөлбөрийг сагсанд нэмээд сагс руу шилжинэ (сунгах / худалдаж авах) */
export function useBuy() {
  const { add } = useCart();
  const nav = useNavigate();
  return (programId) => { add(programId); nav('/account/cart'); };
}

export function LessonThumb({ lesson, theme, className = '' }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className={`relative aspect-video overflow-hidden bg-gradient-to-br ${themeCls(programThemes, theme)} ${className}`}>
      {lesson.thumbnail && !broken && (
        <img src={lesson.thumbnail} alt="" loading="lazy" onError={() => setBroken(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${lesson.canWatch ? '' : 'blur-[2px] brightness-75'}`} />
      )}
      {!lesson.thumbnail && <span aria-hidden="true" className="absolute -right-6 -top-6 h-20 w-20 rounded-full border-[12px] border-brand-yellow/80" />}
      <span className="absolute inset-0 grid place-items-center">
        {lesson.canWatch ? (
          <span className="grid h-12 w-12 place-items-center rounded-full bg-white/95 text-brand-blue shadow-lg transition-transform group-hover:scale-110">
            <Icon name="play" className="ml-0.5 h-5 w-5" />
          </span>
        ) : (
          <span className="grid h-12 w-12 place-items-center rounded-full bg-black/45 text-white backdrop-blur"><Icon name="lock" className="h-5 w-5" /></span>
        )}
      </span>
      <span className="absolute left-2.5 top-2.5 flex gap-1.5">
        {lesson.isFree && <span className="rounded-full bg-brand-yellow px-2 py-0.5 text-[.68rem] font-extrabold text-ink">Үнэгүй</span>}
        {lesson.completed && <span className="flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[.68rem] font-extrabold text-white"><Icon name="tick" className="h-3 w-3" strokeWidth={3} />Үзсэн</span>}
        {!lesson.completed && lesson.watchedAt && lesson.canWatch && <span className="rounded-full bg-white/90 px-2 py-0.5 text-[.68rem] font-extrabold text-brand-royal">Үзэж эхэлсэн</span>}
      </span>
      {lesson.duration && <span className="absolute bottom-2.5 right-2.5 rounded-md bg-black/70 px-1.5 py-0.5 text-xs font-bold text-white tabular-nums">{lesson.duration}</span>}
    </div>
  );
}

/** Бүлгээр (module) нь ангилна, дарааллыг хадгална */
export function byModule(lessons) {
  const out = [];
  for (const l of lessons) {
    const last = out[out.length - 1];
    if (last && last.module === l.module) last.items.push(l);
    else out.push({ module: l.module, items: [l] });
  }
  return out;
}

function LessonCard({ lesson, theme, onLocked }) {
  const body = (
    <>
      <LessonThumb lesson={lesson} theme={theme} />
      <div className="grid gap-1 p-4">
        <p className="font-extrabold leading-snug">{lesson.title}</p>
        {lesson.description && <p className="line-clamp-2 text-sm text-ink-soft">{lesson.description}</p>}
      </div>
    </>
  );
  return lesson.canWatch ? (
    <Link to={`/account/lessons/${lesson.id}`} className="group card block overflow-hidden transition hover:-translate-y-1 hover:border-brand-blue hover:shadow-card">{body}</Link>
  ) : (
    <button type="button" onClick={onLocked} className="group card block w-full overflow-hidden text-left opacity-90 transition hover:opacity-100"
      aria-label={`${lesson.title} — түгжээтэй. Төлбөр төлж нээх`}>{body}</button>
  );
}

function ProgramSection({ group, graceDays, onBuy }) {
  const { program, access, lessons } = group;
  const st = program ? accessState(access, graceDays) : null;
  const watchable = lessons.filter((l) => l.canWatch);
  const done = watchable.filter((l) => l.completed).length;
  const pct = watchable.length ? Math.round((done / watchable.length) * 100) : 0;
  const locked = program && (!access || !access.active);
  const canBuy = program && program.price > 0;

  return (
    <section className="grid gap-5" aria-labelledby={`prog-${program?.id ?? 'general'}`}>
      <div className={`relative overflow-hidden rounded-4xl bg-gradient-to-br ${program ? themeCls(programThemes, program.theme) : 'from-brand-royal to-brand-navy'} p-6 text-white md:p-7`}>
        <span aria-hidden="true" className="absolute -right-14 -top-14 h-28 w-28 rounded-full border-[14px] border-brand-yellow/90" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div className="grid gap-2">
            {program ? (
              <p className="text-sm font-bold text-white/85">{program.age} нас{program.level && ` · ${program.level}`}</p>
            ) : <p className="text-sm font-bold text-white/85">Бүх сурагчдад</p>}
            <h2 id={`prog-${program?.id ?? 'general'}`} className="text-2xl font-extrabold md:text-3xl">{program ? program.title : 'Ерөнхий хичээлүүд'}</h2>
            <div className="flex flex-wrap items-center gap-2">
              {st && <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${st.cls}`}>{st.label}</span>}
              {access?.children?.length > 0 && <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">{access.children.join(', ')}</span>}
            </div>
          </div>
          <div className="grid min-w-[12rem] gap-2">
            {watchable.length > 0 && (
              <>
                <p className="flex justify-between text-sm font-bold"><span>Явц</span><span className="tabular-nums">{done}/{watchable.length} хичээл</span></p>
                <div className="h-2.5 overflow-hidden rounded-full bg-white/25" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Хичээлийн явц">
                  <motion.div className="h-full rounded-full bg-brand-yellow" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
                </div>
              </>
            )}
            {locked && canBuy && (
              <button onClick={() => onBuy(program.id)} className="btn-yellow mt-1 !px-5 !py-3 !text-xs">
                <Icon name="cart" className="h-4 w-4" strokeWidth={2.6} /> {access ? 'Төлбөр сунгах' : 'Худалдаж авах'} · {money(program.price)}
              </button>
            )}
            {st?.key === 'soon' || st?.key === 'grace' ? (
              canBuy && <button onClick={() => onBuy(program.id)} className="btn-white mt-1 !px-5 !py-3 !text-xs">Төлбөр сунгах</button>
            ) : null}
          </div>
        </div>
      </div>

      {!lessons.length ? (
        <p className="rounded-3xl border border-dashed border-line bg-white p-8 text-center font-semibold text-ink-soft">Энэ хөтөлбөрийн видео хичээлүүд удахгүй нэмэгдэнэ.</p>
      ) : byModule(lessons).map((m, mi) => (
        <div key={`${m.module}-${mi}`} className="grid gap-3">
          {m.module && <h3 className="flex items-center gap-2 text-lg font-extrabold"><span className="h-5 w-5 rounded-md bg-brand-yellow" aria-hidden="true" />{m.module}</h3>}
          <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {m.items.map((l) => (
              <StaggerItem key={l.id}>
                <LessonCard lesson={l} theme={program?.theme} onLocked={() => (canBuy ? onBuy(program.id) : null)} />
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      ))}
    </section>
  );
}

export default function Lessons() {
  const buy = useBuy();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api.lessons().then(setData).catch((e) => setError(e.message)); }, []);

  const all = data?.groups.flatMap((g) => g.lessons.map((l) => ({ ...l, theme: g.program?.theme, programTitle: g.program?.title }))) ?? [];
  const resume = all.filter((l) => l.canWatch && l.watchedAt && !l.completed).sort((a, b) => new Date(b.watchedAt) - new Date(a.watchedAt))[0]
    ?? all.find((l) => l.canWatch && !l.completed && !l.isFree);

  return (
    <div className="grid gap-10">
      <div className="grid gap-2">
        <span className="eyebrow">Видео хичээл</span>
        <h1 className="h2">Миний <b className="font-extrabold">видео хичээлүүд</b></h1>
        <p className="lead">Төлбөрөө төлсөн хөтөлбөрийнхөө хичээлүүдийг хүссэн үедээ, хэдэн ч удаа үзээрэй.</p>
      </div>

      {error && <p role="alert" className="rounded-2xl bg-red-50 p-4 font-semibold text-red-700">{error}</p>}

      {!data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="aspect-[4/3] animate-pulse rounded-4xl bg-white" />)}</div>
      ) : !data.groups.length ? (
        <div className="grid justify-items-center gap-4 rounded-4xl border border-dashed border-line bg-white px-6 py-14 text-center">
          <span className="icon3d !h-16 !w-16"><Icon name="video" className="h-8 w-8 text-brand-blue" /></span>
          <p className="text-xl font-extrabold">Одоогоор видео хичээл алга</p>
          <p className="max-w-[44ch] text-ink-soft">Хөтөлбөрт бүртгүүлж төлбөрөө төлмөгц тухайн хөтөлбөрийн видео хичээлүүд энд нээгдэнэ.</p>
          <Link to="/account/programs" className="btn-blue !py-3">Хөтөлбөр сонгох</Link>
        </div>
      ) : (
        <>
          {resume && (
            <Link to={`/account/lessons/${resume.id}`} className="group grid items-center gap-5 overflow-hidden rounded-4xl border border-line bg-white p-4 transition hover:border-brand-blue hover:shadow-card md:grid-cols-[minmax(0,20rem)_1fr] md:p-5">
              <LessonThumb lesson={resume} theme={resume.theme} className="rounded-3xl" />
              <div className="grid gap-2 px-1">
                <p className="text-xs font-extrabold uppercase tracking-[.14em] text-brand-blue">{resume.watchedAt ? 'Үргэлжлүүлэн үзэх' : 'Дараагийн хичээл'}</p>
                <p className="text-2xl font-extrabold leading-tight">{resume.title}</p>
                <p className="text-sm font-semibold text-ink-soft">{[resume.programTitle, resume.module].filter(Boolean).join(' · ')}</p>
                <span className="btn-blue mt-2 w-fit !px-5 !py-3 !text-xs"><Icon name="play" className="h-4 w-4" /> Үзэх</span>
              </div>
            </Link>
          )}
          {data.groups.map((g) => <ProgramSection key={g.program?.id ?? 'general'} group={g} graceDays={data.graceDays} onBuy={buy} />)}
        </>
      )}
    </div>
  );
}
