import { testimonials } from '../../data/content';
import { SectionHead } from '../ui/common';
import { Stagger, StaggerItem } from '../ui/motion';
import Img from '../ui/Img';

export default function Testimonials() {
  return (
    <section className="band" aria-labelledby="quotes-title">
      <div className="wrap">
        <SectionHead id="quotes-title" eyebrow="Сэтгэгдэл" title={<>Эцэг эхчүүд <b className="font-extrabold">юу хэлж байна вэ</b></>} />
        <Stagger className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <StaggerItem key={t.name} as="figure"
              className="card relative flex flex-col gap-4 p-7 transition-shadow duration-300 hover:shadow-card" whileHover={{ y: -6 }}>
              <span className="text-6xl font-black leading-[.6] text-brand-yellow" aria-hidden="true">“</span>
              <div className="tracking-[2px] text-brand-yellow" role="img" aria-label="5 одоос 5">★★★★★</div>
              <blockquote>{t.text}</blockquote>
              <figcaption className="mt-auto flex items-center gap-3">
                <Img src={t.photo} alt="" showName={false} className="h-12 w-12 shrink-0 rounded-full" />
                <div><b className="block text-[.95rem] font-extrabold">{t.name}</b><span className="text-sm text-ink-soft">{t.who}</span></div>
              </figcaption>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
