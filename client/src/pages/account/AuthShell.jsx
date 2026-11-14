import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Logo, Ring, Blob } from '../../components/ui/common';
import Icon from '../../components/ui/Icon';

/** Нэвтрэх, бүртгэл, нууц үг сэргээх хуудсуудын нийтлэг бүрхүүл */
export default function AuthShell({ children }) {
  return (
    <div className="bg-grid-blue relative grid min-h-screen place-items-center overflow-clip px-4 py-10 text-ink">
      <Ring className="-right-40 -top-40 h-[460px] w-[460px]" />
      <Blob className="-bottom-40 -left-40 h-[420px] w-[420px]" />
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-md">
        <Link to="/" className="mb-6 inline-block text-white" aria-label="Нүүр хуудас руу буцах"><Logo /></Link>
        <div className="rounded-4xl bg-white p-6 shadow-2xl shadow-brand-navy/40 sm:p-8">{children}</div>
        <Link to="/" className="mt-5 inline-block text-sm font-semibold text-white/90 hover:underline">← Сайт руу буцах</Link>
      </motion.div>
    </div>
  );
}

export function Field({ id, label, error, hint, children }) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-bold">{label}</label>
      {children}
      {hint && !error && <span className="text-xs text-ink-soft">{hint}</span>}
      {error && <span id={`${id}-err`} className="text-[.8rem] font-semibold text-red-700">{error}</span>}
    </div>
  );
}

export function PasswordInput({ id, value, onChange, autoComplete, invalid, show, onToggle }) {
  return (
    <div className="relative">
      <input id={id} className={`input pr-12 ${invalid ? 'input-error' : ''}`} type={show ? 'text' : 'password'} value={value} onChange={onChange}
        autoComplete={autoComplete} aria-invalid={invalid} aria-describedby={invalid ? `${id}-err` : undefined} />
      <button type="button" onClick={onToggle} aria-label={show ? 'Нууц үгийг нуух' : 'Нууц үгийг харуулах'}
        className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl text-ink-soft hover:bg-white">
        <Icon name={show ? 'eyeOff' : 'eye'} className="h-5 w-5" />
      </button>
    </div>
  );
}

/** Амжилт / мэдэгдлийн том дүрстэй блок */
export function StatusBlock({ icon = 'mail', tone = 'blue', title, children }) {
  return (
    <div className="grid justify-items-center gap-4 text-center">
      <motion.span initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 240, damping: 14 }}
        className={tone === 'yellow' ? 'icon3d-y !h-16 !w-16' : tone === 'red' ? 'grid h-16 w-16 place-items-center rounded-[18px] bg-red-50' : 'check3d !h-16 !w-16 !rounded-[18px]'}>
        <Icon name={icon} className={`h-8 w-8 ${tone === 'yellow' ? 'text-brand-royal' : tone === 'red' ? 'text-red-600' : 'text-white'}`} />
      </motion.span>
      <h1 className="text-2xl font-extrabold">{title}</h1>
      <div className="grid w-full gap-3 text-sm text-ink-soft">{children}</div>
    </div>
  );
}

/** SMTP тохируулаагүй dev орчинд линкийг харуулна */
export function DevLink({ href }) {
  if (!href) return null;
  return (
    <p className="rounded-2xl border-2 border-dashed border-brand-yellow bg-brand-yellow/10 p-3 text-left text-xs text-[#7a5a00]">
      <b>Туршилтын горим:</b> SMTP тохируулаагүй тул и-мэйл илгээгдээгүй. Линк:{' '}
      <a href={href} className="break-all font-bold text-brand-blue underline">{href}</a>
    </p>
  );
}
