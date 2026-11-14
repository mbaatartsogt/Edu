import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { money } from '../../lib/user';
import { Player } from '../../lib/video';
import Icon from '../../components/ui/Icon';
import { accessState, byModule, LessonThumb, useBuy } from './Lessons';

const SAVE_EVERY = 15; // секунд тутам байрлалаа хадгална

export default function LessonPlayer() {
  const { id } = useParams();
  const { flash } = useOutletContext();
  const buy = useBuy();
  const [data, setData] = useState(null);
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState(false);
  const pos = useRef({ current: 0, saved: 0 });
  const videoRef = useRef(null);

  useEffect(() => {
    let alive = true;
    setData(null); setError('');
    api.lesson(id).then((d) => {
      if (!alive) return;
      setData(d);
      setCompleted(d.lesson.completed);
      pos.current = { current: d.lesson.positionSec, saved: d.lesson.positionSec };
      // Нээсэн гэдгийг тэмдэглэнэ ("Үргэлжлүүлэн үзэх", админы статистик)
      if (d.lesson.canWatch) api.lessonProgress(id, { positionSec: d.lesson.positionSec }).catch(() => {});
    }).catch((e) => alive && setError(e.message));
    api.lessons().then((d) => alive && setList(d)).catch(() => {});
    return () => { alive = false; };
  }, [id]);

  // Хуудаснаас гарах үед сүүлийн байрлалаа хадгална
  useEffect(() => () => {
    const p = pos.current;
    if (p.current && Math.abs(p.current - p.saved) >= 3) api.lessonProgress(id, { positionSec: p.current }).catch(() => {});
  }, [id]);

  const onTime = useCallback((e) => {
    const t = e.currentTarget.currentTime;
    pos.current.current = t;
    if (Math.abs(t - pos.current.saved) >= SAVE_EVERY) {
      pos.current.saved = t;
      api.lessonProgress(id, { positionSec: t }).catch(() => {});
    }
  }, [id]);

  const setDone = useCallback(async (value) => {
    setCompleted(value);
    try {
      await api.lessonProgress(id, { positionSec: pos.current.current, completed: value });
      setList((l) => l && { ...l, groups: l.groups.map((g) => ({ ...g, lessons: g.lessons.map((x) => (x.id === id ? { ...x, completed: value } : x)) })) });
      if (value) flash('Сайн байна! Хичээлийг үзэж дууслаа 🎉');
    } catch (e) { setCompleted(!value); flash(e.message, { type: 'error' }); }
  }, [id, flash]);

  if (error) {
    return (
      <div className="grid justify-items-center gap-4 rounded-4xl bg-white px-6 py-14 text-center">
        <p className="text-xl font-extrabold">{error}</p>
        <Link to="/account/lessons" className="btn-blue !py-3">Хичээлүүд рүү буцах</Link>
      </div>
    );
  }
  if (!data) return <div className="grid gap-6"><div className="aspect-video animate-pulse rounded-4xl bg-white" /><div className="h-24 animate-pulse rounded-3xl bg-white" /></div>;

  const { lesson, program, access, player } = data;
  const group = list?.groups.find((g) => (g.program?.id ?? null) === (program?.id ?? null) && g.lessons.some((l) => l.id === lesson.id));
  const siblings = group?.lessons ?? [];
  const idx = siblings.findIndex((l) => l.id === lesson.id);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx >= 0 ? siblings.slice(idx + 1).find((l) => l.canWatch) ?? null : null;
  const st = program ? accessState(access, list?.graceDays) : null;

  return (
    <div className="grid gap-6">
      <nav aria-label="Замын мөр" className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-ink-soft">
        <Link to="/account/lessons" className="hover:text-brand-blue">Видео хичээл</Link>
        <Icon name="arrow" className="h-3.5 w-3.5" />
        <span className="text-ink">{program?.title ?? 'Ерөнхий'}</span>
      </nav>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid content-start gap-5">
          <div className="relative aspect-video overflow-hidden rounded-4xl bg-black shadow-card">
            {player ? (
              <Player player={player} videoRef={videoRef} startAt={lesson.positionSec} onTime={onTime}
                onEnded={() => { if (!completed) setDone(true); }} />
            ) : (
              <div className="absolute inset-0">
                <LessonThumb lesson={lesson} theme={program?.theme} className="!absolute inset-0 !aspect-auto h-full" />
                <div className="absolute inset-0 grid place-items-center bg-brand-navy/70 p-6 text-center text-white">
                  <div className="grid justify-items-center gap-3">
                    <span className="grid h-14 w-14 place-items-center rounded-full bg-white/15"><Icon name="lock" className="h-7 w-7" /></span>
                    <p className="text-xl font-extrabold">{access ? 'Төлбөрийн хугацаа дууссан байна' : 'Энэ хичээл түгжээтэй'}</p>
                    <p className="max-w-[40ch] text-sm text-white/85">“{program?.title}” хөтөлбөрийн төлбөрөө {access ? 'сунгаснаар' : 'төлснөөр'} бүх хичээлийг үзэх боломжтой.</p>
                    {program?.price > 0 && (
                      <button onClick={() => buy(program.id)} className="btn-yellow mt-1 !px-6 !py-3 !text-xs">
                        <Icon name="cart" className="h-4 w-4" strokeWidth={2.6} /> {access ? 'Төлбөр сунгах' : 'Худалдаж авах'} · {money(program.price)}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-4 rounded-4xl border border-line bg-white p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="grid gap-1">
                <p className="text-sm font-bold text-brand-blue">{[program?.title, lesson.module].filter(Boolean).join(' · ') || 'Ерөнхий'}</p>
                <h1 className="text-2xl font-extrabold leading-tight md:text-3xl">{lesson.title}</h1>
                <div className="flex flex-wrap gap-2 pt-1">
                  {lesson.duration && <span className="flex items-center gap-1 rounded-full bg-brand-mist px-2.5 py-1 text-xs font-bold"><Icon name="clock" className="h-3.5 w-3.5" />{lesson.duration}</span>}
                  {lesson.isFree && <span className="rounded-full bg-brand-yellow px-2.5 py-1 text-xs font-extrabold text-ink">Үнэгүй хичээл</span>}
                  {st && !lesson.isFree && <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${st.cls}`}>{st.label}</span>}
                </div>
              </div>
              {player && (
                <button onClick={() => setDone(!completed)} aria-pressed={completed}
                  className={completed ? 'btn bg-emerald-500 !px-5 !py-3 !text-xs text-white' : 'btn-white border-2 border-brand-blue !px-5 !py-3 !text-xs'}>
                  <Icon name="tick" className="h-4 w-4" strokeWidth={3} /> {completed ? 'Үзсэн' : 'Үзэж дууслаа'}
                </button>
              )}
            </div>
            {lesson.description && <p className="whitespace-pre-line text-ink-soft">{lesson.description}</p>}
            {(prev || next) && (
              <div className="flex flex-wrap justify-between gap-3 border-t border-dashed border-line pt-4">
                {prev ? (
                  <Link to={`/account/lessons/${prev.id}`} className="flex min-w-0 items-center gap-2 rounded-full bg-brand-mist px-4 py-2.5 text-sm font-bold hover:bg-brand-sky/30">
                    <Icon name="arrow" className="h-4 w-4 shrink-0 rotate-180" /><span className="truncate">Өмнөх</span>
                  </Link>
                ) : <span />}
                {next && (
                  <Link to={`/account/lessons/${next.id}`} className="btn-blue min-w-0 !px-5 !py-2.5 !text-xs">
                    <span className="truncate">Дараагийн хичээл</span><Icon name="arrow" className="h-4 w-4 shrink-0" strokeWidth={3} />
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {siblings.length > 1 && (
          <aside className="grid content-start gap-3 rounded-4xl border border-line bg-white p-4 xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto" aria-label="Хичээлийн жагсаалт">
            <p className="px-2 pt-1 font-extrabold">{program?.title ?? 'Ерөнхий'} <span className="font-semibold text-ink-soft">· {siblings.filter((l) => l.completed).length}/{siblings.filter((l) => l.canWatch).length}</span></p>
            {byModule(siblings).map((m, mi) => (
              <div key={`${m.module}-${mi}`} className="grid gap-1">
                {m.module && <p className="px-2 pt-2 text-[.7rem] font-extrabold uppercase tracking-[.14em] text-ink-soft">{m.module}</p>}
                <ol className="grid gap-1">
                  {m.items.map((l) => {
                    const current = l.id === lesson.id;
                    const inner = (
                      <>
                        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-black
                          ${l.completed ? 'bg-emerald-500 text-white' : current ? 'bg-brand-blue text-white' : l.canWatch ? 'bg-brand-mist text-brand-royal' : 'bg-slate-100 text-slate-400'}`}>
                          {l.completed ? <Icon name="tick" className="h-4 w-4" strokeWidth={3} /> : !l.canWatch ? <Icon name="lock" className="h-3.5 w-3.5" /> : current ? <Icon name="play" className="ml-0.5 h-3.5 w-3.5" /> : siblings.indexOf(l) + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2 text-sm font-bold leading-snug">{l.title}</span>
                          {l.duration && <span className="text-xs text-ink-soft tabular-nums">{l.duration}</span>}
                        </span>
                      </>
                    );
                    return (
                      <li key={l.id}>
                        {l.canWatch ? (
                          <Link to={`/account/lessons/${l.id}`} aria-current={current ? 'page' : undefined}
                            className={`flex items-center gap-3 rounded-2xl p-2 transition ${current ? 'bg-brand-mist' : 'hover:bg-brand-mist/60'}`}>{inner}</Link>
                        ) : (
                          <div className="flex items-center gap-3 rounded-2xl p-2 opacity-60">{inner}</div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </aside>
        )}
      </div>
    </div>
  );
}
