import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useContent } from '../../lib/content';
import { seasons } from '../../data/seasons';
import Icon from '../ui/Icon';

export const useSeason = () => {
  const { settings } = useContent();
  const s = settings.seasonTheme;
  return seasons[s] && s !== 'default' ? s : null;
};

/** html дээр data-season тавьж бүх брэндийн өнгийг солино (нүүр хуудаснаас гарахад буцаана) */
export function SeasonTheme() {
  const season = useSeason();
  useEffect(() => {
    const root = document.documentElement;
    if (season) root.dataset.season = season; else delete root.dataset.season;
    return () => { delete root.dataset.season; };
  }, [season]);
  return null;
}

/** Алхан хээ — монгол уламжлалт хээний тууз */
export function AlkhanHee({ className = '', color = 'currentColor' }) {
  return (
    <svg className={className} aria-hidden="true" preserveAspectRatio="none">
      <defs>
        <pattern id="alkhan" width="28" height="14" patternUnits="userSpaceOnUse">
          <path d="M0 12H6V2H20V12H14V6" fill="none" stroke={color} strokeWidth="2" strokeLinecap="square" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#alkhan)" />
    </svg>
  );
}

function Tree({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 2l4 6h-2.5l4 5.5h-3l4.5 6H5l4.5-6h-3l4-5.5H8z" fill="#2E8B57" />
      <rect x="10.8" y="19.5" width="2.4" height="3" fill="#8B5A2B" />
      <circle cx="12" cy="2.5" r="1.4" fill="#F6C530" />
    </svg>
  );
}

const BANNER_KEY = 'mindedu_season_banner_hidden';

/** Дээд хэсгийн мэндчилгээний тууз */
export function SeasonBanner() {
  const season = useSeason();
  const [hidden, setHidden] = useState(() => { try { return sessionStorage.getItem(BANNER_KEY) === season; } catch { return false; } });
  useEffect(() => { try { setHidden(sessionStorage.getItem(BANNER_KEY) === season); } catch { /* ignore */ } }, [season]);
  if (!season) return null;
  const s = seasons[season];
  const hide = () => { setHidden(true); try { sessionStorage.setItem(BANNER_KEY, season); } catch { /* ignore */ } };

  return (
    <AnimatePresence initial={false}>
      {!hidden && (
        <motion.div key={season} initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="relative overflow-hidden bg-brand-royal text-white">
          {(season === 'tsagaansar' || season === 'naadam') && <AlkhanHee className="absolute inset-x-0 bottom-0 h-[10px] w-full opacity-60" color="rgb(var(--c-yellow))" />}
          {season === 'naadam' && <span className="absolute inset-x-0 top-0 flex h-1"><i className="flex-1 bg-[#DA2032]" /><i className="flex-1 bg-[#0066B3]" /><i className="flex-1 bg-[#DA2032]" /></span>}
          <div className="wrap flex items-center justify-center gap-3 py-2.5 pr-10 text-center text-sm">
            {season === 'christmas' ? <Tree className="h-5 w-5 shrink-0" /> : <Icon name="sparkle" className="h-4 w-4 shrink-0 text-brand-yellow" />}
            <p><b className="font-extrabold">{s.greeting}</b> <span className="hidden text-white/85 sm:inline">· {s.sub}</span></p>
          </div>
          <button onClick={hide} aria-label="Мэндчилгээг хаах" className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg hover:bg-white/15">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Header-ийн доор унжих гэрлэн гирлянд (Зул сар) */
export function ChristmasLights() {
  const colors = ['#FF4D4D', '#F6C530', '#3DDC84', '#4DA3FF', '#FF7AD9'];
  const n = 28;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -bottom-4 h-6 overflow-hidden">
      <svg className="absolute inset-x-0 top-0 h-3 w-full" preserveAspectRatio="none" viewBox="0 0 100 6">
        <path d={Array.from({ length: 14 }, (_, i) => `${i ? '' : 'M0 1 '}Q${i * 7.14 + 3.57} 6 ${(i + 1) * 7.14} 1`).join(' ')} fill="none" stroke="#123" strokeOpacity=".5" strokeWidth=".35" />
      </svg>
      <div className="absolute inset-x-0 top-1 flex justify-around">
        {Array.from({ length: n }, (_, i) => (
          <span key={i} className="season-anim block h-2.5 w-1.5 rounded-b-full"
            style={{ color: colors[i % colors.length], background: colors[i % colors.length], marginTop: `${Math.abs(Math.sin((i / n) * Math.PI * 14)) * 7}px`, animation: `bulb-blink ${1.2 + (i % 4) * 0.35}s ease-in-out ${i * 0.13}s infinite` }} />
        ))}
      </div>
    </div>
  );
}

/** Hero хэсгийн баярын чимэглэл */
export function SeasonDecor() {
  const season = useSeason();
  if (!season) return null;

  if (season === 'christmas') {
    const balls = [{ l: '3%', len: 30, c: '#F6C530', d: 0 }, { l: '44%', len: 46, c: '#FF4D4D', d: 0.6 }, { l: '49%', len: 22, c: '#ffffff', d: 1.1 }, { l: '96%', len: 40, c: '#3DDC84', d: 0.3 }];
    return (
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-0 hidden h-60 md:block">
        {balls.map((b, i) => (
          <div key={i} className="season-anim absolute top-0 origin-top" style={{ left: b.l, animation: `swing ${3 + i * 0.4}s ease-in-out ${b.d}s infinite` }}>
            <div className="mx-auto w-px bg-white/60" style={{ height: b.len }} />
            <div className="relative -mt-0.5 h-9 w-9 rounded-full shadow-lg" style={{ background: `radial-gradient(circle at 35% 30%, #fff 0 8%, ${b.c} 30%, rgba(0,0,0,.25) 100%)` }}>
              <span className="absolute -top-1.5 left-1/2 h-2 w-3 -translate-x-1/2 rounded-sm bg-[#C9A227]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (season === 'newyear') {
    const stars = Array.from({ length: 16 }, (_, i) => ({ l: `${(i * 37) % 100}%`, t: `${(i * 53) % 90}%`, s: 10 + (i % 4) * 6, d: (i % 7) * 0.4 }));
    return (
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
        {stars.map((st, i) => (
          <span key={i} className="season-anim absolute text-brand-yellow" style={{ left: st.l, top: st.t, animation: `twinkle ${2 + (i % 3)}s ease-in-out ${st.d}s infinite` }}>
            <Icon name="sparkle" className="drop-shadow" style={{ width: st.s, height: st.s }} strokeWidth={1.5} />
          </span>
        ))}
      </div>
    );
  }

  if (season === 'naadam') {
    const flags = ['#DA2032', '#0066B3', '#FFD100'];
    return (
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-0 h-16 overflow-hidden">
        <svg className="absolute inset-x-0 top-0 h-3 w-full" preserveAspectRatio="none" viewBox="0 0 100 4"><path d="M0 0.5 Q50 4 100 0.5" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth=".3" /></svg>
        <div className="absolute inset-x-0 top-0.5 flex justify-around px-2">
          {Array.from({ length: 22 }, (_, i) => (
            <span key={i} className="season-anim block h-7 w-5 origin-top" style={{ marginTop: `${Math.sin((i / 21) * Math.PI) * 9}px`, clipPath: 'polygon(0 0, 100% 0, 50% 100%)', background: flags[i % 3], animation: `swing ${2.4 + (i % 3) * 0.4}s ease-in-out ${i * 0.1}s infinite` }} />
          ))}
        </div>
      </div>
    );
  }

  // Цагаан сар: доод талд алхан хээтэй алтан тууз
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-5 bg-brand-royal/40">
      <AlkhanHee className="h-full w-full" color="rgb(var(--c-yellow))" />
    </div>
  );
}
