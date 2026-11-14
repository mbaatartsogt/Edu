import { motion, useReducedMotion } from 'framer-motion';
import { telHref, useContent } from '../../lib/content';
import { branchThemes, themeCls } from '../../data/themes';
import { Reveal } from '../ui/motion';
import { Logo, SkeletonCards } from '../ui/common';
import Icon from '../ui/Icon';
import { OptionalImg } from '../ui/Img';

const ease = [0.22, 1, 0.36, 1];

function BranchCard({ b, i }) {
  const reduce = useReducedMotion();
  const mapUrl = b.mapUrl || (b.address ? `https://maps.google.com/?q=${encodeURIComponent(b.address)}` : '');
  return (
    <motion.article
      className={`relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br text-white shadow-[0_24px_50px_-24px_rgba(0,30,90,.6)] sm:rounded-[2.75rem] ${themeCls(branchThemes, b.theme)}`}
      initial={reduce ? false : { opacity: 0, x: i % 2 ? 80 : -80 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.8, ease }}
      whileHover={{ scale: 1.015 }}
    >
      <OptionalImg src={b.bgImage} className="absolute inset-0 -z-10 h-full w-full object-cover" />
      <span aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-black/50 via-black/20 to-black/25" />
      <OptionalImg src={b.kidsImage} alt={`MindEdu ${b.name} ${b.region} салбарын сурагчид`}
        className="pointer-events-none absolute bottom-0 right-[-6%] -z-10 hidden h-[96%] w-auto object-contain object-bottom sm:block lg:right-[22%]" />

      <div className="grid min-h-[230px] gap-6 p-6 sm:min-h-[270px] sm:p-10 md:grid-cols-[1fr_auto] md:items-end">
        <div className="min-w-0 self-center">
          <h3 className="text-[clamp(2rem,5.4vw,3.4rem)] font-black uppercase leading-[.92] tracking-tight [text-shadow:0_3px_18px_rgba(0,0,0,.25)]">
            {b.name}{b.region && <><br />{b.region}</>}
          </h3>
          {b.address && (
            <p className="mt-3 flex max-w-[44ch] gap-2 text-sm font-medium text-white/95 [text-shadow:0_1px_8px_rgba(0,0,0,.35)] sm:text-[.95rem]">
              <Icon name="pin" className="mt-0.5 h-4 w-4 shrink-0" />{b.address}
            </p>
          )}
          {b.hours && (
            <p className="mt-1.5 flex gap-2 text-sm font-medium text-white/90 [text-shadow:0_1px_8px_rgba(0,0,0,.35)]">
              <Icon name="clock" className="mt-0.5 h-4 w-4 shrink-0" />{b.hours}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 md:flex-col md:items-end">
          {b.phone && (
            <a href={telHref(b.phone)} className="text-[clamp(1.8rem,4.4vw,2.8rem)] font-black leading-none tabular-nums [text-shadow:0_3px_18px_rgba(0,0,0,.25)] hover:text-brand-yellow">
              {b.phone}
            </a>
          )}
          {mapUrl && (
            <a href={mapUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider backdrop-blur transition hover:bg-white hover:text-ink">
              <Icon name="pin" className="h-4 w-4" /> Газрын зураг
            </a>
          )}
        </div>
      </div>
    </motion.article>
  );
}

export default function Branches() {
  const { branches, settings, loading } = useContent();
  if (!loading && !branches.length) return null;

  return (
    <section id="branches" className="band relative text-white" aria-labelledby="branches-title"
      style={{ background: 'linear-gradient(180deg, rgb(var(--c-blue)) 0%, #5FA4F2 30%, #A9C9D8 62%, #EBD27A 88%, rgb(var(--c-yellow)) 100%)' }}>
      <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(rgb(255_255_255/.18)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/.18)_1px,transparent_1px)] bg-[size:44px_44px]" />

      <div className="wrap relative">
        <Reveal className="mb-12 grid gap-5 md:mb-16">
          <div className="flex flex-wrap items-start gap-x-8 gap-y-3">
            <Logo className="md:mt-5" />
            <h2 id="branches-title" className="text-[clamp(3rem,10vw,7.5rem)] font-black leading-[.85] tracking-tight">
              Манай <span className="block">салбарууд</span>
            </h2>
          </div>
          <p className="max-w-[56ch] text-base text-white/90 md:text-lg">
            MindEdu Улаанбаатар болон орон нутагт {branches.length || ''} салбартай. Танд ойр салбартаа хүүхдээ бүртгүүлээрэй.
          </p>
        </Reveal>

        {loading ? (
          <SkeletonCards count={2} className="grid gap-6 sm:gap-8" itemClass="h-[260px] !bg-white/25" />
        ) : (
          <div className="grid gap-6 sm:gap-8">
            {branches.map((b, i) => <BranchCard key={b.id} b={b} i={i} />)}
          </div>
        )}

        {settings.phone && (
          <Reveal className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-ink">
            <a href={telHref(settings.phone)} className="flex items-center gap-3 text-[clamp(1.4rem,3.6vw,2rem)] font-black tabular-nums">
              <span className="grid h-11 w-11 place-items-center rounded-full border-[3px] border-ink"><Icon name="phone" className="h-5 w-5" /></span>
              {settings.phone}
            </a>
            <span className="text-sm font-semibold">Бүх салбарын мэдээлэл, бүртгэл</span>
          </Reveal>
        )}
      </div>
    </section>
  );
}
