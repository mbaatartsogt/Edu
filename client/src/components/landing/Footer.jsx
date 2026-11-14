import { telHref, useContent } from '../../lib/content';
import { Logo } from '../ui/common';
import Icon, { FacebookIcon } from '../ui/Icon';

const socialCls = 'grid h-11 w-11 place-items-center rounded-2xl bg-white/10 transition hover:-translate-y-0.5 hover:bg-brand-blue';

export default function Footer() {
  const { settings: site } = useContent();
  const socials = [
    { url: site.facebook, label: 'Facebook', icon: <FacebookIcon /> },
    { url: site.instagram, label: 'Instagram', icon: <Icon name="instagram" /> },
    { url: site.threads, label: 'Threads', icon: <Icon name="threads" /> },
    { url: site.messenger, label: 'Messenger', icon: <Icon name="messenger" /> },
  ].filter((s) => s.url);
  return (
    <footer id="contact" className="bg-brand-navy pb-8 pt-16 text-white/90">
      <div className="wrap">
        <div className="grid gap-9 md:grid-cols-[1.1fr_1fr_1.3fr]">
          <div className="grid content-start gap-5">
            <a href="#top" className="text-white"><Logo /></a>
            <p className="max-w-[34ch] text-sm">8–18 насны хүүхэд, өсвөр үеийнхэнд зориулсан англи хэлний сургалтын төв.</p>
            <div className="flex gap-3 empty:hidden">
              {socials.map((s) => (
                <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={`MindEdu ${s.label} хуудас`} className={socialCls}>{s.icon}</a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="mb-3.5 text-xs font-extrabold uppercase tracking-[.16em] text-brand-yellow">Холбоо барих</h4>
            <address className="grid gap-2.5 text-[.94rem] not-italic">
              {site.address && <span>{site.address}</span>}
              {site.phone && <span>Утас: <a href={telHref(site.phone)} className="hover:text-brand-yellow">{site.phone}</a></span>}
              {site.email && <span>И-мэйл: <a href={`mailto:${site.email}`} className="hover:text-brand-yellow">{site.email}</a></span>}
              {site.hours && <span>{site.hours}</span>}
            </address>
          </div>
          <div>
            <h4 className="mb-3.5 text-xs font-extrabold uppercase tracking-[.16em] text-brand-yellow">Байршил</h4>
            {/* Google Maps embed ашиглах бол энэ <a>-г <iframe>-ээр солино */}
            <a href={site.mapUrl || `https://maps.google.com/?q=${encodeURIComponent(site.address || 'Ulaanbaatar')}`} target="_blank" rel="noopener noreferrer" aria-label="Google Maps дээр байршил харах"
              className="group relative grid aspect-[16/10] place-items-center overflow-hidden rounded-[20px] bg-[#123A9C]
                bg-[linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] bg-[size:28px_28px]">
              <span className="absolute inset-0 bg-[linear-gradient(28deg,transparent_46%,rgb(var(--c-sky)/.5)_46%_49%,transparent_49%),linear-gradient(-62deg,transparent_58%,rgba(255,255,255,.25)_58%_60%,transparent_60%)]" />
              <span className="relative grid justify-items-center gap-3 text-sm font-bold">
                <i className="h-11 w-11 -rotate-45 rounded-[50%_50%_50%_0] bg-brand-yellow shadow-lg transition-transform group-hover:-translate-y-1" />
                Газрын зураг дээр харах
              </span>
            </a>
          </div>
        </div>
        <div className="mt-11 flex flex-wrap justify-between gap-3 border-t border-white/15 pt-5 text-[.82rem] opacity-75">
          <span>© {new Date().getFullYear()} MindEdu. Бүх эрх хуулиар хамгаалагдсан.</span>
          <span>MindTech Mongolia</span>
        </div>
      </div>
    </footer>
  );
}
