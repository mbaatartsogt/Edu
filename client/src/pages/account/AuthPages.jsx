import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useUser } from '../../lib/user';
import AuthShell, { DevLink, Field, PasswordInput, StatusBlock } from './AuthShell';
import { DevCode, OtpInput, useResendTimer } from './Otp';

/** /verify-email?token=… — и-мэйлийн линкээр орж ирнэ */
export function VerifyEmail() {
  const [params] = useSearchParams();
  const { login } = useUser();
  const nav = useNavigate();
  const [state, setState] = useState('loading'); // loading | ok | error
  const [msg, setMsg] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // StrictMode-д хоёр удаа дуудагдахаас сэргийлнэ (токен нэг удаагийнх)
    ran.current = true;
    api.verifyEmail(params.get('token'))
      .then((res) => { login(res.token, res.user); setState('ok'); })
      .catch((err) => { setMsg(err.message); setState('error'); });
  }, [params, login]);

  return (
    <AuthShell>
      {state === 'loading' && <StatusBlock icon="mail" title="Баталгаажуулж байна…"><p>Түр хүлээнэ үү.</p></StatusBlock>}
      {state === 'ok' && (
        <StatusBlock icon="tick" title="И-мэйл баталгаажлаа!">
          <p>Таны бүртгэл идэвхжлээ. Бүртгэлийн урамшуулал болгож <b className="text-ink">MindPoint оноо</b> нэмэгдлээ.</p>
          <button onClick={() => nav('/account/programs', { replace: true })} className="btn-blue">Хөтөлбөр сонгох</button>
        </StatusBlock>
      )}
      {state === 'error' && (
        <StatusBlock icon="close" tone="red" title="Линк ажиллахгүй байна">
          <p>{msg}</p>
          <p>Нэвтрэх хуудсанд и-мэйл, нууц үгээ оруулахад “Линк дахин илгээх” сонголт гарна.</p>
          <Link to="/login" className="btn-blue">Нэвтрэх</Link>
        </StatusBlock>
      )}
    </AuthShell>
  );
}

/** /forgot-password — и-мэйлээр линк эсвэл утсаар SMS код */
export function ForgotPassword() {
  const { login } = useUser();
  const nav = useNavigate();
  const [method, setMethod] = useState('phone');
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);      // и-мэйл илгээгдсэн
  const [phoneStep, setPhoneStep] = useState(null); // { phone, devCode }
  const [code, setCode] = useState('');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [left, setLeft] = useResendTimer(0);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (method === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return setError('И-мэйл хаягаа зөв оруулна уу.');
      setBusy(true);
      try { setDone(await api.forgotPassword(value.trim())); } catch (err) { setError(err.message); } finally { setBusy(false); }
      return;
    }
    const phone = value.replace(/\D/g, '');
    if (phone.length !== 8) return setError('8 оронтой утасны дугаар оруулна уу.');
    setBusy(true);
    try {
      const res = await api.resendOtp(phone, 'reset');
      setPhoneStep({ phone, devCode: res.devCode }); setLeft(60);
    } catch (err) { setError(err.message); if (err.body?.wait) { setPhoneStep({ phone }); setLeft(err.body.wait); } }
    finally { setBusy(false); }
  }

  async function resend() {
    setErrors({});
    try { const res = await api.resendOtp(phoneStep.phone, 'reset'); setPhoneStep((s) => ({ ...s, devCode: res.devCode })); setLeft(60); }
    catch (err) { setErrors({ code: err.message }); if (err.body?.wait) setLeft(err.body.wait); }
  }

  async function reset(e) {
    e.preventDefault();
    const errs = {};
    if (code.length !== 6) errs.code = '6 оронтой кодоо оруулна уу.';
    if (pw.length < 6) errs.password = 'Нууц үг хамгийн багадаа 6 тэмдэгт байна.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const res = await api.resetByPhone(phoneStep.phone, code, pw);
      login(res.token, res.user);
      nav('/account', { replace: true });
    } catch (err) {
      if (err.body?.errors) { setErrors(err.body.errors); if (err.body.errors.code) setCode(''); } else setErrors({ code: err.message });
    } finally { setBusy(false); }
  }

  if (done) {
    return (
      <AuthShell>
        <StatusBlock icon="mail" title="И-мэйлээ шалгана уу">
          <p><b className="text-ink">{value}</b> хаягаар бүртгэл байвал нууц үг солих линк илгээлээ. Линк 1 цагийн турш хүчинтэй.</p>
          <p className="text-xs">И-мэйл ирэхгүй бол “Spam” хавтсаа шалгаарай.</p>
          <DevLink href={done.devLink} />
          <Link to="/login" className="btn-blue">Нэвтрэх хуудас руу</Link>
        </StatusBlock>
      </AuthShell>
    );
  }

  if (phoneStep) {
    return (
      <AuthShell>
        <form onSubmit={reset} noValidate className="grid gap-4">
          <div>
            <h1 className="text-2xl font-extrabold">Шинэ нууц үг</h1>
            <p className="text-sm text-ink-soft"><b className="text-ink tabular-nums">{phoneStep.phone.slice(0, 4)} {phoneStep.phone.slice(4)}</b> дугаараар бүртгэл байвал 6 оронтой код илгээлээ.</p>
          </div>
          <div className="grid gap-1.5">
            <span className="text-sm font-bold">SMS код</span>
            <OtpInput id="reset-otp" value={code} onChange={(v) => { setCode(v); setErrors((x) => ({ ...x, code: undefined })); }} invalid={!!errors.code} autoFocus />
            {errors.code && <span role="alert" className="text-[.8rem] font-semibold text-red-700">{errors.code}</span>}
          </div>
          <DevCode code={phoneStep.devCode} />
          <Field id="password" label="Шинэ нууц үг" error={errors.password} hint="Хамгийн багадаа 6 тэмдэгт">
            <PasswordInput id="password" value={pw} onChange={(e) => setPw(e.target.value)} invalid={!!errors.password} autoComplete="new-password" show={show} onToggle={() => setShow((s) => !s)} />
          </Field>
          <button className="btn-blue" disabled={busy}>{busy ? 'Хадгалж байна…' : 'Нууц үг солих'}</button>
          <p className="text-center text-sm text-ink-soft">
            {left > 0 ? <span className="tabular-nums">{left} секундын дараа дахин код авах</span>
              : <button type="button" onClick={resend} className="font-bold text-brand-blue hover:underline">Код дахин илгээх</button>}
          </p>
          <button type="button" onClick={() => setPhoneStep(null)} className="text-sm font-bold text-ink-soft hover:text-ink">← Буцах</button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <form onSubmit={submit} noValidate className="grid gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Нууц үг сэргээх</h1>
          <p className="text-sm text-ink-soft">Бүртгүүлсэн утас эсвэл и-мэйлээ оруулна уу.</p>
        </div>
        <div className="grid grid-cols-2 rounded-2xl bg-brand-mist p-1" role="tablist">
          {[['phone', 'Утсаар (SMS)'], ['email', 'И-мэйлээр']].map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={method === k} onClick={() => { setMethod(k); setValue(''); setError(''); }}
              className={`rounded-xl py-2.5 text-sm font-extrabold transition ${method === k ? 'bg-white text-brand-navy shadow' : 'text-ink-soft'}`}>{label}</button>
          ))}
        </div>
        <Field id="fp-value" label={method === 'phone' ? 'Утасны дугаар' : 'И-мэйл'} error={error}>
          <input id="fp-value" className={`input ${error ? 'input-error' : ''}`} type={method === 'phone' ? 'tel' : 'email'} inputMode={method === 'phone' ? 'numeric' : 'email'}
            value={value} onChange={(e) => { setValue(e.target.value); setError(''); }} autoComplete={method === 'phone' ? 'tel' : 'email'}
            placeholder={method === 'phone' ? '9911 2233' : 'name@example.com'} aria-invalid={!!error} aria-describedby={error ? 'fp-value-err' : undefined} />
        </Field>
        <button className="btn-blue" disabled={busy}>{busy ? 'Илгээж байна…' : method === 'phone' ? 'Код авах' : 'Линк илгээх'}</button>
        <Link to="/login" className="text-center text-sm font-bold text-brand-blue hover:underline">← Нэвтрэх</Link>
      </form>
    </AuthShell>
  );
}

/** /reset-password?token=… */
export function ResetPassword() {
  const [params] = useSearchParams();
  const { login } = useUser();
  const nav = useNavigate();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    if (pw.length < 6) errs.password = 'Нууц үг хамгийн багадаа 6 тэмдэгт байна.';
    else if (pw !== pw2) errs.password2 = 'Нууц үг таарахгүй байна.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true); setError('');
    try {
      const res = await api.resetPassword(params.get('token'), pw);
      login(res.token, res.user);
      setDone(true);
    } catch (err) {
      if (err.body?.errors) setErrors(err.body.errors); else setError(err.message);
    } finally { setBusy(false); }
  }

  if (!params.get('token')) {
    return (
      <AuthShell>
        <StatusBlock icon="close" tone="red" title="Линк буруу байна">
          <p>И-мэйлээр ирсэн линкийг бүтнээр нь нээнэ үү.</p>
          <Link to="/forgot-password" className="btn-blue">Шинэ линк авах</Link>
        </StatusBlock>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      {done ? (
        <StatusBlock icon="tick" title="Нууц үг солигдлоо">
          <p>Шинэ нууц үгээрээ нэвтэрлээ.</p>
          <button onClick={() => nav('/account', { replace: true })} className="btn-blue">Миний булан руу</button>
        </StatusBlock>
      ) : (
        <form onSubmit={submit} noValidate className="grid gap-4">
          <div>
            <h1 className="text-2xl font-extrabold">Шинэ нууц үг</h1>
            <p className="text-sm text-ink-soft">Шинэ нууц үгээ хоёр удаа оруулна уу.</p>
          </div>
          <Field id="password" label="Шинэ нууц үг" error={errors.password} hint="Хамгийн багадаа 6 тэмдэгт">
            <PasswordInput id="password" value={pw} onChange={(e) => setPw(e.target.value)} invalid={!!errors.password} autoComplete="new-password" show={show} onToggle={() => setShow((s) => !s)} />
          </Field>
          <Field id="password2" label="Нууц үг давтах" error={errors.password2}>
            <PasswordInput id="password2" value={pw2} onChange={(e) => setPw2(e.target.value)} invalid={!!errors.password2} autoComplete="new-password" show={show} onToggle={() => setShow((s) => !s)} />
          </Field>
          {error && (
            <div role="alert" className="grid gap-1 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error} <Link to="/forgot-password" className="text-brand-blue underline">Шинэ линк авах</Link>
            </div>
          )}
          <button className="btn-blue" disabled={busy}>{busy ? 'Хадгалж байна…' : 'Нууц үг солих'}</button>
        </form>
      )}
    </AuthShell>
  );
}
