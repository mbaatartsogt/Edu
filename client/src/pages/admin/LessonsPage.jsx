import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { parseVideo } from '../../lib/video';
import { programThemes, themeCls } from '../../data/themes';
import Icon from '../../components/ui/Icon';
import ResourcePage from './ResourcePage';

/** Видео хичээлүүд — хөтөлбөр бүрт хичээл нэмж, төлбөр төлсөн эцэг эхчүүдэд харуулна */
export default function LessonsPage() {
  const nav = useNavigate();
  const [programs, setPrograms] = useState(null);
  const [stats, setStats] = useState({});
  const [maxMb, setMaxMb] = useState(2048);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.list('programs'), api.lessonStats()])
      .then(([p, s]) => { setPrograms(p); setStats(s.stats); setMaxMb(s.maxUploadMb); })
      .catch((e) => (e.status === 401 ? nav('/admin/login', { replace: true }) : setError(e.message)));
  }, [nav]);

  const config = useMemo(() => {
    if (!programs) return null;
    const byId = Object.fromEntries(programs.map((p) => [p.id, p]));
    const programLabel = (p) => `${p.title} (${p.age} нас)${p.visible ? '' : ' — нуусан'}`;
    return {
      resource: 'lessons',
      title: 'Видео хичээлүүд',
      description: 'Хөтөлбөрийн төлбөрөө төлсөн эцэг эхчүүд “Миний булан → Видео хичээл” хэсгээс зөвхөн өөрийн хөтөлбөрийн хичээлийг үзнэ. Төлбөрийн хугацаа дуусвал хичээл түгжигдэнэ.',
      addLabel: 'Хичээл нэмэх',
      defaults: { programId: programs[0]?.id ?? '', module: '', title: '', description: '', video: '', duration: '', thumbnail: '', isFree: false, visible: true },
      filter: {
        field: 'programId',
        options: [...programs.map((p) => ({ value: p.id, label: p.title })), { value: '', label: 'Ерөнхий', hideEmpty: true }],
      },
      fields: [
        {
          name: 'programId', label: 'Хөтөлбөр', type: 'select',
          options: [...programs.map((p) => ({ value: p.id, label: programLabel(p) })), { value: '', label: 'Ерөнхий — аль ч хөтөлбөрийн идэвхтэй сурагч үзнэ' }],
          help: 'Энэ хөтөлбөрийн төлбөр төлсөн эцэг эхчүүд үзнэ.',
        },
        { name: 'module', label: 'Бүлэг / сэдэв', placeholder: 'Unit 1 · Greetings', help: 'Ижил бүлэгтэй хичээлүүд нэг дор бүлэглэгдэнэ. Хоосон байж болно.' },
        { name: 'title', label: 'Хичээлийн нэр', required: true, placeholder: 'Lesson 1 — Hello & Goodbye' },
        { name: 'video', label: 'Видео', type: 'video', required: true, maxMb },
        { name: 'duration', label: 'Үргэлжлэх хугацаа', placeholder: '12:30', help: 'Файл хуулахад автоматаар бөглөгдөнө.' },
        { name: 'description', label: 'Тайлбар, даалгавар', type: 'textarea', rows: 4, placeholder: 'Энэ хичээлээр… Гэрийн даалгавар: …' },
        { name: 'thumbnail', label: 'Нүүр зураг (заавал биш)', type: 'image', maxSize: 1280, aspect: 'aspect-video', help: 'Хоосон бол YouTube-ийн зургийг автоматаар ашиглана.' },
        { name: 'isFree', label: 'Үнэгүй үзүүлэх (танилцуулга хичээл — бүх нэвтэрсэн хэрэглэгч үзнэ)', type: 'bool' },
        { name: 'visible', label: 'Идэвхтэй (эцэг эхчүүдэд харагдана)', type: 'bool' },
      ],
      banner: (items) => (!programs.length ? (
        <p role="alert" className="rounded-3xl border-2 border-brand-yellow bg-white p-5 font-bold">Эхлээд “Хөтөлбөрүүд” хэсэгт хөтөлбөр нэмнэ үү.</p>
      ) : !items.length ? (
        <div className="grid gap-3 rounded-3xl border border-line bg-white p-5 text-sm text-ink-soft md:grid-cols-3">
          {[
            ['1', 'Хичээл нэмэх', 'Хөтөлбөрөө сонгоод YouTube/Vimeo холбоос буулгах эсвэл MP4 файл хуулна.'],
            ['2', 'Эцэг эх төлбөр төлнө', 'QPay-аар (эсвэл та “Төлсөн болгох”) төлөгдсөн даруйд эрх нээгдэнэ.'],
            ['3', 'Миний булан → Видео хичээл', 'Эцэг эх, хүүхэд хоёр зөвхөн өөрийн хөтөлбөрийн хичээлийг үзнэ.'],
          ].map(([n, t, d]) => (
            <div key={n} className="flex gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-yellow font-black text-ink">{n}</span>
              <div><p className="font-extrabold text-ink">{t}</p><p>{d}</p></div>
            </div>
          ))}
        </div>
      ) : null),
      preview: (l) => {
        const p = byId[l.programId];
        const v = parseVideo(l.video);
        const thumb = l.thumbnail || v?.thumbnail;
        const st = stats[l.id];
        return (
          <div>
            <div className={`relative aspect-video overflow-hidden bg-gradient-to-br ${themeCls(programThemes, p?.theme)}`}>
              {thumb && <img src={thumb} alt="" className="absolute inset-0 h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
              <span className="absolute inset-0 grid place-items-center">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-white/90 text-brand-blue shadow-lg"><Icon name="play" className="ml-0.5 h-5 w-5" /></span>
              </span>
              <span className="absolute left-3 top-3 flex gap-1.5">
                <span className="rounded-full bg-black/55 px-2 py-0.5 text-[.7rem] font-bold text-white">{v?.label ?? 'Видео'}</span>
                {l.isFree && <span className="rounded-full bg-brand-yellow px-2 py-0.5 text-[.7rem] font-extrabold text-ink">Үнэгүй</span>}
              </span>
              {l.duration && <span className="absolute bottom-3 right-3 rounded-md bg-black/70 px-1.5 py-0.5 text-xs font-bold text-white tabular-nums">{l.duration}</span>}
            </div>
            <div className="grid gap-1 p-4">
              <p className="text-xs font-bold text-brand-blue">{p ? p.title : 'Ерөнхий'}{l.module && ` · ${l.module}`}</p>
              <p className="font-extrabold leading-snug">{l.title}</p>
              <p className="mt-1 flex gap-3 text-xs font-semibold text-ink-soft">
                <span className="flex items-center gap-1"><Icon name="eye" className="h-3.5 w-3.5" />{st?.viewers ?? 0} үзсэн</span>
                <span className="flex items-center gap-1"><Icon name="tick" className="h-3.5 w-3.5" />{st?.completed ?? 0} дуусгасан</span>
              </p>
            </div>
          </div>
        );
      },
    };
  }, [programs, stats, maxMb]);

  if (error) return <p role="alert" className="rounded-2xl bg-red-50 p-4 font-semibold text-red-700">{error}</p>;
  if (!config) return <div className="h-96 animate-pulse rounded-3xl bg-white" />;
  return <ResourcePage config={config} />;
}
