import { useEffect, useRef, useState } from 'react';
import { api, uploadVideo } from '../../lib/api';
import { fmtDuration, fmtSize, parseVideo, Player, uploadedVideoId } from '../../lib/video';
import Icon from '../ui/Icon';

/** Зургийг хөтөч дээрээ багасгаж, WEBP болгоно (тунгалаг дэвсгэр хадгалагдана) */
function resizeImage(file, maxSize) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return reject(new Error('PNG, JPG эсвэл WEBP зураг сонгоно уу.'));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      let out = canvas.toDataURL('image/webp', 0.86);
      if (!out.startsWith('data:image/webp')) out = canvas.toDataURL(file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png', 0.88);
      resolve(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Зургийг уншиж чадсангүй.')); };
    img.src = url;
  });
}

export function ImageField({ id, value, onChange, maxSize = 1200, aspect = 'aspect-square', help }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [broken, setBroken] = useState(null);

  async function pick(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true); setError('');
    try {
      const dataUrl = await resizeImage(file, maxSize);
      const { url } = await api.uploadImage(dataUrl);
      onChange(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const showImg = value && broken !== value;
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-4">
        <div className={`relative w-28 shrink-0 overflow-hidden rounded-2xl border border-line bg-[repeating-conic-gradient(#eef3fb_0_25%,#fff_0_50%)] bg-[length:16px_16px] ${aspect}`}>
          {showImg
            ? <img src={value} alt="" onError={() => setBroken(value)} className="h-full w-full object-cover" />
            : <span className="grid h-full place-items-center px-2 text-center text-[11px] font-semibold text-ink-soft">{value ? 'Файл олдсонгүй' : 'Зураггүй'}</span>}
          {busy && <span className="absolute inset-0 grid place-items-center bg-white/80 text-xs font-bold text-brand-blue">Хуулж байна…</span>}
        </div>
        <div className="grid gap-2">
          <input ref={input} id={id} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={pick} />
          <button type="button" onClick={() => input.current?.click()} disabled={busy}
            className="rounded-full bg-brand-blue px-4 py-2 text-sm font-bold text-white hover:bg-brand-royal disabled:opacity-60">
            {value ? 'Зураг солих' : 'Зураг оруулах'}
          </button>
          {value && (
            <button type="button" onClick={() => onChange('')} className="text-left text-sm font-semibold text-red-600 hover:underline">Зураг хасах</button>
          )}
        </div>
      </div>
      {help && <p className="text-xs text-ink-soft">{help}</p>}
      {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
    </div>
  );
}

/** Видео: холбоос буулгах эсвэл файл хуулах (явцтай), урьдчилж харах */
export function VideoField({ id, value, onChange, form, maxMb }) {
  const [mode, setMode] = useState(() => (value && !uploadedVideoId(value) ? 'link' : value ? 'file' : 'link'));
  const [upload, setUpload] = useState(null); // { name, size, progress, loaded, abort }
  const [error, setError] = useState('');
  const [drag, setDrag] = useState(false);
  const [preview, setPreview] = useState(false);
  const [fileInfo, setFileInfo] = useState(null); // хуулсан файлын { src, name, size }
  const input = useRef(null);
  const info = parseVideo(value);
  const uploadedId = uploadedVideoId(value);

  // Хуулсан файлын нэр, хэмжээ, тоглуулах холбоосыг авна
  useEffect(() => {
    setFileInfo(null);
    if (!uploadedId) return;
    let alive = true;
    api.adminVideo(uploadedId).then((d) => alive && setFileInfo(d)).catch(() => alive && setFileInfo({ missing: true }));
    return () => { alive = false; };
  }, [uploadedId]);

  // Маягтыг хаахад хуулж байсныг зогсооно
  const abortRef = useRef(null);
  useEffect(() => () => abortRef.current?.(), []);

  function readDuration(file) {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => {
      if (Number.isFinite(v.duration) && form && !String(form.data.duration || '').trim()) form.set('duration', fmtDuration(v.duration));
      URL.revokeObjectURL(url);
    };
    v.onerror = () => URL.revokeObjectURL(url);
    v.src = url;
  }

  async function start(file) {
    if (!file) return;
    setError(''); setPreview(false);
    if (!/\.(mp4|m4v|webm|mov)$/i.test(file.name)) return setError('MP4, WEBM, MOV эсвэл M4V файл сонгоно уу. (MP4 хамгийн олон төхөөрөмж дээр ажиллана)');
    if (maxMb && file.size > maxMb * 1024 * 1024) return setError(`Файл ${maxMb}MB-аас их байна (${fmtSize(file.size)}). Видеогоо шахаж багасгах эсвэл YouTube/Vimeo холбоос ашиглана уу.`);
    readDuration(file);
    const job = uploadVideo(file, (progress, loaded) => setUpload((u) => u && { ...u, progress, loaded }));
    abortRef.current = job.abort;
    setUpload({ name: file.name, size: file.size, progress: 0, loaded: 0, abort: job.abort });
    try {
      const { url } = await job.promise;
      onChange(url);
    } catch (err) {
      if (err.status !== -1) setError(err.message);
    } finally {
      abortRef.current = null;
      setUpload(null);
    }
  }

  const tab = (k, label, icon) => (
    <button type="button" role="tab" aria-selected={mode === k} onClick={() => { setMode(k); setError(''); }} disabled={!!upload}
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition disabled:opacity-50
        ${mode === k ? 'bg-white text-brand-royal shadow' : 'text-ink-soft hover:text-ink'}`}>
      <Icon name={icon} className="h-4 w-4" />{label}
    </button>
  );

  const previewPlayer = info?.provider === 'upload'
    ? (fileInfo?.src ? { kind: 'file', src: fileInfo.src } : null)
    : info && info.kind !== 'invalid' ? info : null;

  return (
    <div className="grid gap-3">
      <div role="tablist" className="flex gap-1 rounded-2xl bg-brand-mist p-1">
        {tab('link', 'Холбоос буулгах', 'link')}
        {tab('file', 'Файл хуулах', 'upload')}
      </div>

      {mode === 'link' ? (
        <div className="grid gap-2">
          <input id={id} type="url" inputMode="url" className={inputCls} placeholder="https://youtu.be/… эсвэл https://vimeo.com/…"
            value={uploadedId ? '' : value ?? ''} onChange={(e) => { onChange(e.target.value.trim()); setPreview(false); }} />
          {info && !uploadedId && (
            <p className={`flex items-center gap-1.5 text-xs font-bold ${info.kind === 'invalid' ? 'text-red-700' : 'text-emerald-700'}`}>
              {info.kind === 'invalid' ? '✕' : '✓'} {info.label}
              {info.provider === 'youtube' && <span className="font-semibold text-ink-soft">· YouTube дээр “Unlisted (Хязгаарлагдмал)” горимоор байршуулна уу</span>}
            </p>
          )}
          {uploadedId && <p className="text-xs font-semibold text-ink-soft">Одоо хуулсан файл ашиглаж байна. Холбоос оруулбал файлын оронд холбоос хадгалагдана.</p>}
          <p className="text-xs text-ink-soft">YouTube, Vimeo, Google Drive, эсвэл .mp4 шууд холбоос. Хамгийн аюулгүй нь Vimeo (domain хязгаарлалттай) эсвэл файлаар хуулах.</p>
        </div>
      ) : upload ? (
        <div className="grid gap-2 rounded-2xl border-2 border-brand-blue/30 bg-white p-4" aria-live="polite">
          <div className="flex items-center justify-between gap-3 text-sm">
            <p className="truncate font-bold">{upload.name}</p>
            <p className="shrink-0 font-black text-brand-blue tabular-nums">{Math.round(upload.progress * 100)}%</p>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-brand-mist" role="progressbar" aria-valuenow={Math.round(upload.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-gradient-to-r from-brand-sky to-brand-blue transition-[width]" style={{ width: `${upload.progress * 100}%` }} />
          </div>
          <div className="flex items-center justify-between text-xs text-ink-soft">
            <span className="tabular-nums">{fmtSize(upload.loaded)} / {fmtSize(upload.size)}</span>
            <button type="button" onClick={upload.abort} className="font-bold text-red-600 hover:underline">Цуцлах</button>
          </div>
          <p className="text-xs text-ink-soft">Хуулж дуустал энэ цонхыг хааж болохгүй.</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {uploadedId && (
            <div className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3">
              <span className="icon3d !h-10 !w-10 shrink-0"><Icon name="video" className="h-5 w-5 text-brand-blue" /></span>
              <div className="min-w-0 flex-1 text-sm">
                <p className="truncate font-bold">{fileInfo?.missing ? 'Файл олдсонгүй' : fileInfo?.name || 'Видео файл'}</p>
                {fileInfo?.size ? <p className="text-xs text-ink-soft">{fmtSize(fileInfo.size)}</p> : null}
              </div>
              <button type="button" onClick={() => onChange('')} className="text-sm font-semibold text-red-600 hover:underline">Хасах</button>
            </div>
          )}
          <label htmlFor={id}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); start(e.dataTransfer.files?.[0]); }}
            className={`grid cursor-pointer justify-items-center gap-1.5 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition
              ${drag ? 'border-brand-blue bg-brand-mist' : 'border-line hover:border-brand-blue hover:bg-brand-mist/50'}`}>
            <Icon name="upload" className="h-7 w-7 text-brand-blue" />
            <span className="text-sm font-bold">{uploadedId ? 'Өөр файлаар солих' : 'Видео файл сонгох эсвэл энд чирж оруулах'}</span>
            <span className="text-xs text-ink-soft">MP4 (H.264) зөвлөмжтэй{maxMb ? ` · ${maxMb >= 1024 ? `${(maxMb / 1024).toFixed(maxMb % 1024 ? 1 : 0)}GB` : `${maxMb}MB`} хүртэл` : ''}</span>
          </label>
          <input ref={input} id={id} type="file" accept="video/mp4,video/webm,video/quicktime,video/x-m4v,.mp4,.m4v,.webm,.mov" className="sr-only"
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; start(f); }} />
        </div>
      )}

      {previewPlayer && !upload && (
        <div className="grid gap-2">
          <button type="button" onClick={() => setPreview((x) => !x)} className="flex w-fit items-center gap-1.5 text-sm font-bold text-brand-blue hover:underline">
            <Icon name={preview ? 'eyeOff' : 'play'} className="h-4 w-4" />{preview ? 'Урьдчилж харахыг хаах' : 'Урьдчилж харах'}
          </button>
          {preview && <div className="aspect-video overflow-hidden rounded-2xl bg-black"><Player player={previewPlayer} /></div>}
        </div>
      )}
      {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
    </div>
  );
}

const inputCls = 'w-full rounded-xl border-2 border-transparent bg-brand-mist px-3.5 py-2.5 text-[.95rem] font-medium text-ink outline-none transition focus:border-brand-blue focus:bg-white';

/** Тайлбарласан талбаруудаас маягт үүсгэнэ */
export function Field({ field, value, onChange, error, form }) {
  const id = `f-${field.name}`;
  const common = { id, 'aria-invalid': !!error, 'aria-describedby': error ? `${id}-err` : undefined };
  let control;
  switch (field.type) {
    case 'textarea':
      control = <textarea {...common} rows={field.rows ?? 3} className={inputCls} value={value ?? ''} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />;
      break;
    case 'list':
      control = <textarea {...common} rows={field.rows ?? 4} className={inputCls} value={(value ?? []).join('\n')} placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value.split('\n'))} />;
      break;
    case 'theme':
      control = (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby={`${id}-label`}>
          {Object.entries(field.themes).map(([k, t]) => (
            <button key={k} type="button" role="radio" aria-checked={value === k} onClick={() => onChange(k)}
              className={`flex items-center gap-2 rounded-full border-2 py-1 pl-1 pr-3 text-sm font-semibold transition
                ${value === k ? 'border-brand-blue bg-white' : 'border-transparent bg-brand-mist hover:border-line'}`}>
              <span className={`h-7 w-7 rounded-full bg-gradient-to-br ${t.cls}`} />{t.label}
            </button>
          ))}
        </div>
      );
      break;
    case 'select':
      control = (
        <select {...common} className={inputCls} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          {field.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
      break;
    case 'image':
      control = <ImageField id={id} value={value} onChange={onChange} maxSize={field.maxSize} aspect={field.aspect} help={field.help} />;
      break;
    case 'video':
      control = <VideoField id={id} value={value} onChange={onChange} form={form} maxMb={field.maxMb} />;
      break;
    case 'bool':
      return (
        <label className="flex cursor-pointer items-center gap-3 text-sm font-bold">
          <input id={id} type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 accent-brand-blue" />
          {field.label}
        </label>
      );
    default:
      control = <input {...common} type={field.inputType ?? 'text'} className={inputCls} value={value ?? ''} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />;
  }
  return (
    <div className="grid gap-1.5">
      <label htmlFor={field.type === 'theme' || field.type === 'video' ? undefined : id} id={`${id}-label`} className="text-sm font-bold">
        {field.label}{field.required && <span className="text-red-600"> *</span>}
      </label>
      {control}
      {field.help && field.type !== 'image' && <p className="text-xs text-ink-soft">{field.help}</p>}
      {error && <p id={`${id}-err`} className="text-sm font-semibold text-red-700">{error}</p>}
    </div>
  );
}

export { inputCls };
