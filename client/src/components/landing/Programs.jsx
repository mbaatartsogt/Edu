import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useContent } from '../../lib/content';
import { money } from '../../lib/user';
import { useCart } from '../../lib/cart';
import { useState } from 'react';
import { programThemes, themeCls } from '../../data/themes';
import { SectionHead, SkeletonCards } from '../ui/common';
import { Stagger, StaggerItem } from '../ui/motion';
import Icon from '../ui/Icon';

/** Хулганаар хөдөлгөхөд бага зэрэг хазайх 3D карт */
function TiltCard({ children, className }) {
  const x = useMotionValue(0.5), y = useMotionValue(0.5);
  const rx = useSpring(useTransform(y, [0, 1], [5, -5]), { stiffness: 200, damping: 20 });
  const ry = useSpring(useTransform(x, [0, 1], [-6, 6]), { stiffness: 200, damping: 20 });
  return (
    <motion.article
      className={className}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse') return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - r.left) / r.width); y.set((e.clientY - r.top) / r.height);
      }}
      onPointerLeave={() => { x.set(0.5); y.set(0.5); }}
      whileHover={{ y: -8 }}
    >
      {children}
    </motion.article>
  );
}

export default function Programs() {
  const { programs, loading, settings } = useContent();
  const { add, count } = useCart();
  const [justAdded, setJustAdded] = useState(null);
  const addToCart = (id) => { add(id); setJustAdded(id); setTimeout(() => setJustAdded((x) => (x === id ? null : x)), 2500); };
  if (!loading && !programs.length) return null;
  return (
    <section id="programs" className="band" aria-labelledby="programs-title">
      <div className="wrap">
        <SectionHead id="programs-title" eyebrow="Хөтөлбөр"
          title={<>Нас бүрт <b className="font-extrabold">тохирсон хөтөлбөр</b></>}
          lead="Элсэхээс өмнө хүүхэд бүр түвшин тогтоох шалгалт өгч, өөрт тохирох бүлэгт хуваарилагдана." />
        {loading ? <SkeletonCards className="grid gap-6 md:grid-cols-3" itemClass="h-[440px]" /> : (
        <Stagger className={`grid gap-6 ${programs.length >= 3 ? 'md:grid-cols-3' : programs.length === 2 ? 'md:grid-cols-2' : 'mx-auto max-w-md'}`}>
          {programs.map((p) => (
            <StaggerItem key={p.id} className="h-full">
              <TiltCard className="card flex h-full flex-col overflow-hidden transition-shadow hover:shadow-card">
                <div className={`relative overflow-hidden bg-gradient-to-br ${themeCls(programThemes, p.theme)} p-6 pb-5 text-white`}>
                  <span className="absolute -right-8 -top-8 h-28 w-28 rounded-full border-[16px] border-brand-yellow" aria-hidden="true" />
                  <p className="text-[2.6rem] font-black leading-none tabular-nums">{p.age}<span className="ml-1 text-base font-semibold">нас</span></p>
                  <h3 className="mt-2 text-lg font-bold">{p.title}</h3>
                  {p.level && <span className="mt-3 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold tracking-wide">{p.level}</span>}
                </div>
                <div className="flex flex-1 flex-col gap-5 p-6">
                  {p.goals.length > 0 && <div>
                    <h4 className="mb-2.5 text-xs font-extrabold uppercase tracking-[.14em] text-brand-blue">Зорилго</h4>
                    <ul className="grid gap-2">
                      {p.goals.map((g) => (
                        <li key={g} className="flex gap-2.5 text-[.94rem] text-ink-soft">
                          <span className="mt-2 h-2 w-2 shrink-0 rounded-sm bg-brand-yellow" aria-hidden="true" />{g}
                        </li>
                      ))}
                    </ul>
                  </div>}
                  {(p.days || p.classTime) && (
                    <div className="mt-auto grid gap-1 rounded-xl bg-brand-mist px-4 py-3.5 text-sm">
                      {p.days && <b className="font-extrabold">{p.days}</b>}{p.classTime && <span>{p.classTime}</span>}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-line pt-4">
                    {p.price > 0 ? (
                      <>
                        <p><span className="text-2xl font-black tabular-nums">{money(p.price)}</span> <span className="text-sm text-ink-soft">{p.priceLabel}</span></p>
                        {justAdded === p.id ? (
                          <Link to="/account/cart" className="btn-yellow !px-5 !py-3 !text-xs"><Icon name="tick" className="h-4 w-4" strokeWidth={3} /> Сагс ({count})</Link>
                        ) : (
                          <button onClick={() => addToCart(p.id)} className="btn-blue !px-5 !py-3 !text-xs"><Icon name="cart" className="h-4 w-4" strokeWidth={2.6} /> Сагсанд нэмэх</button>
                        )}
                      </>
                    ) : (
                      <p className="text-sm font-semibold text-ink-soft">Үнийг {settings.phone || 'утсаар'} лавлана уу</p>
                    )}
                  </div>
                </div>
              </TiltCard>
            </StaggerItem>
          ))}
        </Stagger>
        )}
      </div>
    </section>
  );
}
