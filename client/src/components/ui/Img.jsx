import { useState } from 'react';

/** Файл байхгүй бол юу ч харуулахгүй зураг (чимэглэлийн давхаргад) */
export function OptionalImg({ src, alt = '', className = '' }) {
  const [failed, setFailed] = useState(null);
  if (!src || failed === src) return null;
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(src)} className={className} />;
}

/**
 * Солигддог зураг: файл байхгүй бол цэнхэр placeholder дээр файлын нэрийг харуулна.
 * Жинхэнэ зургаа client/public/images/ хавтсанд ижил нэрээр хийхэд л болно.
 */
export default function Img({ src, alt, className = '', showName = true, eager = false }) {
  const [failed, setFailed] = useState(null);
  const missing = !src || failed === src;
  const setMissing = () => setFailed(src);
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-brand-mist to-[#cfe3ff] ${className}`}>
      {!missing ? (
        <img src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} onError={() => setMissing(true)}
          className="h-full w-full object-cover" />
      ) : (
        <>
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <circle cx="50" cy="40" r="15" fill="rgb(var(--c-blue) / .25)" />
            <ellipse cx="50" cy="96" rx="34" ry="28" fill="rgb(var(--c-blue) / .2)" />
          </svg>
          <span className="sr-only">{alt}</span>
          {showName && src && (
            <span className="absolute inset-x-2.5 bottom-2.5 break-all rounded-lg bg-white/85 px-2 py-1.5 text-center text-[11px] font-semibold text-brand-royal">
              public{src}
            </span>
          )}
        </>
      )}
    </div>
  );
}
