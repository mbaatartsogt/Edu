import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import { money } from '../../lib/user';
import { useCart } from '../../lib/cart';
import { programThemes, themeCls } from '../../data/themes';
import { Stagger, StaggerItem } from '../../components/ui/motion';
import Icon from '../../components/ui/Icon';

export default function ProgramsPage() {
  const { flash } = useOutletContext();
  const { add, countOf } = useCart();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api.content().then(setData).catch((e) => setError(e.message)); }, []);

  function addToCart(p) {
    add(p.id);
    flash(`“${p.title}” сагсанд нэмэгдлээ`, { action: { to: '/account/cart', label: 'Сагс руу' } });
  }

  return (
    <div className="grid gap-8">
      <div className="grid gap-2">
        <span className="eyebrow">Хөтөлбөр сонгох</span>
        <h1 className="h2">Хүүхдэдээ тохирох <b className="font-extrabold">хөтөлбөр</b></h1>
        <p className="lead">Хэд хэдэн хөтөлбөр (эсвэл хэд хэдэн хүүхэд) сагсанд нэмээд нэг дор төлөх боломжтой.</p>
      </div>

      {error && <p role="alert" className="rounded-2xl bg-red-50 p-4 font-semibold text-red-700">{error}</p>}

      {!data ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-96 animate-pulse rounded-4xl bg-white" />)}</div>
      ) : (
        <Stagger className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {data.programs.map((p) => {
            const inCart = countOf(p.id);
            return (
              <StaggerItem key={p.id} className="card flex flex-col overflow-hidden">
                <div className={`relative overflow-hidden bg-gradient-to-br ${themeCls(programThemes, p.theme)} p-6 text-white`}>
                  <span className="absolute -right-8 -top-8 h-24 w-24 rounded-full border-[14px] border-brand-yellow" aria-hidden="true" />
                  <p className="text-3xl font-black leading-none">{p.age}<span className="ml-1 text-sm font-semibold">нас</span></p>
                  <p className="mt-2 text-lg font-bold">{p.title}</p>
                  {p.level && <span className="mt-2 inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold">{p.level}</span>}
                  {inCart > 0 && (
                    <motion.span key={inCart} initial={{ scale: 0 }} animate={{ scale: 1 }}
                      className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-extrabold text-brand-navy shadow">
                      <Icon name="cart" className="h-3.5 w-3.5" /> {inCart}
                    </motion.span>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-4 p-6">
                  {p.goals.length > 0 && (
                    <ul className="grid gap-1.5">
                      {p.goals.slice(0, 3).map((g) => (
                        <li key={g} className="flex gap-2 text-sm text-ink-soft"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-sm bg-brand-yellow" aria-hidden="true" />{g}</li>
                      ))}
                    </ul>
                  )}
                  {(p.days || p.classTime) && <p className="rounded-xl bg-brand-mist px-3 py-2 text-sm font-semibold">{[p.days, p.classTime].filter(Boolean).join(' · ')}</p>}
                  <div className="mt-auto grid gap-3 border-t border-dashed border-line pt-4">
                    {p.price > 0 ? (
                      <>
                        <p><span className="text-2xl font-black tabular-nums">{money(p.price)}</span> <span className="text-sm text-ink-soft">{p.priceLabel}</span></p>
                        <button onClick={() => addToCart(p)} className={inCart ? 'btn-white border-2 border-brand-blue !py-3.5' : 'btn-blue !py-3.5'}>
                          <Icon name={inCart ? 'plus' : 'cart'} className="h-4 w-4" strokeWidth={2.6} /> {inCart ? 'Дахин нэмэх (өөр хүүхэд)' : 'Сагсанд нэмэх'}
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-ink-soft">Үнийг {data.settings.phone || 'утсаар'} лавлана уу</p>
                        <span className="btn pointer-events-none bg-brand-mist !py-3.5 text-ink-soft">Онлайнаар удахгүй</span>
                      </>
                    )}
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}
    </div>
  );
}
