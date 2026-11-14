import { Reveal } from './motion';
import Icon from './Icon';

export function Logo({ className = '', compact = false }) {
  return (
    <span className={`inline-flex flex-col leading-none ${className}`}>
      <span className="text-[1.7rem] font-black tracking-tight">
        MindEdu<sup className="ml-px align-super text-[.55rem] font-bold">®</sup>
      </span>
      {!compact && <span className="mt-1.5 text-[.52rem] font-semibold tracking-[.12em] opacity-90">АНГЛИ ХЭЛНИЙ СУРГАЛТЫН ТӨВ</span>}
    </span>
  );
}

export function SectionHead({ eyebrow, title, lead, light = false, id }) {
  return (
    <Reveal className="mb-10 grid gap-4 md:mb-14">
      <span className={`eyebrow ${light ? '!text-white' : ''}`}>{eyebrow}</span>
      <h2 id={id} className="h2">{title}</h2>
      {lead && <p className={`lead ${light ? '!text-white/85' : ''}`}>{lead}</p>}
    </Reveal>
  );
}

export function Check({ className = '' }) {
  return (
    <span className={`check3d ${className}`} aria-hidden="true">
      <Icon name="tick" className="h-5 w-5 text-white" strokeWidth={3.4} />
    </span>
  );
}

/** Арын шар хүрээтэй дугуй, цайвар цэнхэр blob */
export function Ring({ className = '', style }) {
  return <span aria-hidden="true" style={style}
    className={`pointer-events-none absolute rounded-full border-[clamp(14px,2vw,22px)] border-brand-yellow ${className}`} />;
}
export function Blob({ className = '' }) {
  return <span aria-hidden="true"
    className={`pointer-events-none absolute rounded-full bg-[radial-gradient(circle_at_35%_35%,rgb(var(--c-sky)/.65),transparent_70%)] ${className}`} />;
}

/** Контент ачаалж байх үеийн саарал картууд */
export function SkeletonCards({ count = 3, className = '', itemClass = 'h-80' }) {
  return (
    <div className={className} aria-busy="true" aria-label="Ачаалж байна">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`animate-pulse rounded-4xl bg-brand-mist ${itemClass}`} />
      ))}
    </div>
  );
}
