import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { api } from '../../lib/api';
import Icon from '../../components/ui/Icon';

const fmtPhone = (p) => `${String(p).slice(0, 4)} ${String(p).slice(4)}`;

/**
 * 6 оронтой код оруулах талбар. Нэг жинхэнэ input (SMS автоматаар бөглөх, paste ажиллана)
 * дээр 6 нүдийг харуулна.
 */
export function OtpInput({ value, onChange, invalid, autoFocus, id = 'otp' }) {
  const ref = useRef(null);
  const [focused, setFocused] = useState(false);
  const reduce = useReducedMotion();
  useEffect(() => { if (autoFocus) ref.current?.focus({ preventScroll: true }); }, [autoFocus]);
  const digits = value.padEnd(6, ' ').split('');
  return (
    <div className="relative" onClick={() => ref.current?.focus()}>
      <input ref={ref} id={id} value={value} inputMode="numeric" autoComplete="one-time-code" maxLength={6} aria-label="6 оронтой код"
        aria-invalid={invalid} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        className="absolute inset-0 h-full w-full cursor-text opacity-0" />
      <motion.div className="grid grid-cols-6 gap-2" aria-hidden="true"
        animate={invalid && !reduce ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }} transition={{ duration: 0.4 }}>
        {digits.map((d, i) => {
          const active = focused && (i === value.length || (value.length === 6 && i === 5));
          return (
            <span key={i} className={`grid aspect-[4/5] place-items-center rounded-2xl border-2 text-2xl font-black tabular-nums transition
              ${invalid ? 'border-red-400 bg-red-50' : active ? 'border-brand-blue bg-white shadow-[0_0_0_4px_rgb(var(--c-blue)/.15)]' : d.trim() ? 'border-brand-sky bg-brand-mist' : 'border-line bg-brand-mist'}`}>
              {d.trim() || (active ? <span className="h-7 w-0.5 animate-pulse bg-brand-blue" /> : '')}
            </span>
          );
        })}
      </motion.div>
    </div>
  );
}

/** Дахин илгээх товч — 60 секундын хүлээлттэй */
export function useResendTimer(initial = 60) {
  const [left, setLeft] = useState(initial);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return [left, setLeft];
}

export function DevCode({ code }) {
  if (!code) return null;
  return (
    <p className="rounded-2xl border-2 border-dashed border-brand-yellow bg-brand-yellow/10 p-3 text-left text-xs text-[#7a5a00]">
      <b>Туршилтын горим:</b> SMS тохируулаагүй тул мессеж илгээгдээгүй. Код: <b className="font-mono text-sm tracking-widest text-brand-royal">{code}</b>
    </p>
  );
}

/** Бүртгэл баталгаажуулах OTP дэлгэц */
export function OtpVerify({ phone, devCode: initialDev, wait = 60, onVerified, onBack }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState('');
  const [devCode, setDevCode] = useState(initialDev);
  const [left, setLeft] = useResendTimer(wait);

  async function verify(c = code) {
    if (c.length !== 6) return setError('6 оронтой кодоо оруулна уу.');
    setBusy(true); setError('');
    try { const res = await api.verifyOtp(phone, c); onVerified(res); }
    catch (err) { setError(err.message); setCode(''); }
    finally { setBusy(false); }
  }

  async function resend() {
    setError(''); setInfo('');
    try {
      const res = await api.resendOtp(phone);
      setDevCode(res.devCode); setInfo('Шинэ код илгээлээ.'); setLeft(60);
    } catch (err) { setError(err.message); if (err.body?.wait) setLeft(err.body.wait); }
  }

  // 6 орон бөглөгдмөгц автоматаар шалгана
  const change = (v) => { setCode(v); setError(''); if (v.length === 6 && !busy) verify(v); };

  return (
    <div className="grid gap-5">
      <div className="grid justify-items-center gap-3 text-center">
        <motion.span initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 240, damping: 14 }} className="check3d !h-16 !w-16 !rounded-[18px]">
          <Icon name="phone" className="h-8 w-8 text-white" />
        </motion.span>
        <h1 className="text-2xl font-extrabold">Утсаа баталгаажуулна уу</h1>
        <p className="text-sm text-ink-soft"><b className="text-ink tabular-nums">{fmtPhone(phone)}</b> дугаарт илгээсэн 6 оронтой кодыг оруулна уу.</p>
      </div>
      <OtpInput value={code} onChange={change} invalid={!!error} autoFocus />
      {error && <p role="alert" className="text-center text-sm font-semibold text-red-700">{error}</p>}
      {info && !error && <p role="status" className="text-center text-sm font-semibold text-emerald-700">{info}</p>}
      <DevCode code={devCode} />
      <button onClick={() => verify()} disabled={busy || code.length !== 6} className="btn-blue">{busy ? 'Шалгаж байна…' : 'Баталгаажуулах'}</button>
      <p className="text-center text-sm text-ink-soft">
        Код ирээгүй юу?{' '}
        {left > 0 ? <span className="font-semibold tabular-nums">{left} секундын дараа дахин авах</span>
          : <button onClick={resend} className="font-bold text-brand-blue hover:underline">Код дахин илгээх</button>}
      </p>
      {onBack && <button onClick={onBack} className="text-sm font-bold text-ink-soft hover:text-ink">← Буцах</button>}
    </div>
  );
}
