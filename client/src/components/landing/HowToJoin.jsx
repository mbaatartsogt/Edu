import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useUser } from '../../lib/user';
import { useContent, telHref } from '../../lib/content';
import { Blob, Ring, SectionHead } from '../ui/common';
import { Reveal } from '../ui/motion';
import Icon from '../ui/Icon';

const steps = [
  { icon: 'user', title: 'Нэвтрэх', text: 'Утасны дугаараараа бүртгэл үүсгээд нэвтэрнэ. Ганцхан минут.' },
  { icon: 'cart', title: 'Сагсанд нэмэх', text: 'Хүүхэд бүрт тохирох хөтөлбөрөө сагсанд нэмээд салбараа сонгоно.' },
  { icon: 'card', title: 'Нэг дор төлөх', text: 'Сагсны бүх хөтөлбөрийг нэг QPay QR-ээр төлнө. Бүртгэл шууд баталгаажна.' },
];

export default function HowToJoin() {
  const { user } = useUser();
  const { settings } = useContent();
  const reduce = useReducedMotion();
  const cta = user ? { to: '/account/programs', label: 'Хөтөлбөр сонгох' } : { to: '/login?mode=register', label: 'Нэвтрэх / Бүртгүүлэх' };

  return (
    <section id="enroll" className="band bg-grid-blue text-white" aria-labelledby="join-title">
      <Blob className="-right-48 -top-40 h-[520px] w-[520px]" />
      <Ring className="-bottom-28 -left-36 h-[300px] w-[300px]" />
      <div className="wrap relative">
        <SectionHead id="join-title" light eyebrow="Элсэлт"
          title={<><b className="font-extrabold">Enroll now.</b> 3 алхамд элсээрэй.</>}
          lead="Онлайнаар нэвтэрч хөтөлбөрөө сонгоод төлбөрөө төлөхөд хүүхдийн тань бүртгэл баталгаажна." />

        <ol className="relative grid gap-5 md:grid-cols-3">
          {/* Алхмуудыг холбох тасархай шугам */}
          <motion.span aria-hidden="true" className="absolute left-[16%] right-[16%] top-[52px] hidden h-0 origin-left border-t-[3px] border-dashed border-white/40 md:block"
            initial={reduce ? false : { scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 1.2, delay: 0.3 }} />
          {steps.map((s, i) => (
            <motion.li key={s.title} className="relative grid justify-items-center gap-4 rounded-4xl bg-white p-7 text-center text-ink shadow-[0_30px_60px_-30px_rgba(0,0,0,.5)]"
              initial={reduce ? false : { opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}>
              <span className="relative">
                <span className={i === 2 ? 'icon3d-y !h-16 !w-16' : 'icon3d !h-16 !w-16'}>
                  <Icon name={s.icon} className={`h-8 w-8 ${i === 2 ? 'text-brand-royal' : 'text-brand-blue'}`} />
                </span>
                <span className="absolute -right-3 -top-3 grid h-8 w-8 place-items-center rounded-full bg-brand-navy text-sm font-black text-white tabular-nums">{i + 1}</span>
              </span>
              <h3 className="text-xl font-extrabold">{s.title}</h3>
              <p className="text-[.95rem] text-ink-soft">{s.text}</p>
            </motion.li>
          ))}
        </ol>

        <Reveal className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
          <Link to={cta.to} className="btn-yellow group">
            {cta.label} <Icon name="arrow" className="h-[18px] w-[18px] transition-transform group-hover:translate-x-1" strokeWidth={3} />
          </Link>
          {settings.phone && (
            <a href={telHref(settings.phone)} className="flex items-center gap-2 font-bold text-white/90 hover:text-white">
              <Icon name="phone" className="h-5 w-5" /> Асуух зүйл байвал: {settings.phone}
            </a>
          )}
        </Reveal>
      </div>
    </section>
  );
}
