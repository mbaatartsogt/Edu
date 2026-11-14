// Видео холбоосыг тоглуулагч болгох (server/videos.js-ийн playerFor-той ижил дүрэм)
const UPLOADED_RE = /^\/api\/videos\/([0-9a-f-]{36})$/i;

export const uploadedVideoId = (v) => UPLOADED_RE.exec(String(v || ''))?.[1] ?? null;

export function parseVideo(value) {
  const v = String(value || '').trim();
  if (!v) return null;
  if (uploadedVideoId(v)) return { kind: 'file', provider: 'upload', label: 'Хуулсан файл' };
  let m = /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([\w-]{11})/i.exec(v);
  if (m) return { kind: 'iframe', provider: 'youtube', label: 'YouTube', src: `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0&modestbranding=1&playsinline=1`, thumbnail: `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg` };
  m = /vimeo\.com\/(?:video\/|channels\/[\w-]+\/|groups\/[\w-]+\/videos\/)?(\d+)(?:\/([\da-f]{6,}))?/i.exec(v);
  if (m) {
    const hash = m[2] || /[?&]h=([\da-f]+)/i.exec(v)?.[1];
    return { kind: 'iframe', provider: 'vimeo', label: 'Vimeo', src: `https://player.vimeo.com/video/${m[1]}?dnt=1${hash ? `&h=${hash}` : ''}` };
  }
  m = /drive\.google\.com\/(?:file\/d\/|open\?id=)([\w-]{10,})/i.exec(v);
  if (m) return { kind: 'iframe', provider: 'drive', label: 'Google Drive', src: `https://drive.google.com/file/d/${m[1]}/preview` };
  if (!/^https:\/\//i.test(v)) return { kind: 'invalid', label: 'Буруу холбоос' };
  if (/\.(mp4|webm|m4v|mov|ogv)(\?|#|$)/i.test(v)) return { kind: 'file', provider: 'direct', label: 'Видео файл (холбоос)', src: v };
  return { kind: 'iframe', provider: 'other', label: 'Бусад (embed)', src: v };
}

export const fmtDuration = (sec) => {
  const s = Math.max(0, Math.round(sec || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
};

export const fmtSize = (bytes) => (bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(2)} GB` : `${(bytes / 1024 ** 2).toFixed(1)} MB`);

/** Тоглуулагч: iframe эсвэл <video> */
export function Player({ player, onEnded, onTime, startAt = 0, videoRef, className = '' }) {
  if (!player) return null;
  if (player.kind === 'file') {
    return (
      <video ref={videoRef} key={player.src} src={player.src} controls playsInline preload="metadata"
        controlsList="nodownload" disablePictureInPicture={false} onContextMenu={(e) => e.preventDefault()}
        onLoadedMetadata={(e) => { if (startAt > 3 && startAt < e.currentTarget.duration - 5) e.currentTarget.currentTime = startAt; }}
        onEnded={onEnded} onTimeUpdate={onTime}
        className={`h-full w-full bg-black ${className}`} />
    );
  }
  return (
    <iframe key={player.src} src={player.src} title="Видео хичээл" className={`h-full w-full border-0 bg-black ${className}`}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin" />
  );
}
