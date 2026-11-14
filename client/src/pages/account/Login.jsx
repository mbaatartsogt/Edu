import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../../lib/api';
import { useUser } from '../../lib/user';
import Icon from '../../components/ui/Icon';
import AuthShell, { DevLink, Field, PasswordInput, StatusBlock } from './AuthShell';
import { OtpVerify } from './Otp';

const empty = { name: '', phone: '', email: '', password: '', identifier: '' };

/** Бүртгүүлэх арга сонгох (утас / и-мэйл) */
function MethodPicker({ value, onChange }) {
  const opts = [
    { k: 'phone', icon: 'phone', label: 'Утасны дугаар', hint: 'SMS код' },
    { k: 'email', icon: 'mail', label: 'И-мэйл', hint: 'Баталгаажуулах линк' },
  ];
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-sm font-bold">Юугаар бүртгүүлэх вэ?</legend>
      <div className="grid grid-cols-2 gap-2">
        {opts.map((o) => (
          <label key={o.k} className={`relative flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-3 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-yellow
            ${value === o.k ? 'border-brand-blue bg-brand-mist' : 'border-line hover:border-brand-sky'}`}>
            <input type="radio" name="method" value={o.k} checked={value === o.k} onChange={() => onChange(o.k)} className="sr-only" />
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${value === o.k ? 'bg-brand-blue text-white' : 'bg-brand-mist text-brand-blue'}`}>
              <Icon name={o.icon} className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-extrabold leading-tight">{o.label}</span>
              <span className="block text-xs text-ink-soft">{o.hint}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function Login() {
  const { user, ready, login } = useUser();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next')?.startsWith('/') ? params.get('next') : '/account';
  const [mode, setMode] = useState(params.get('mode') === 'register' ? 'register' : 'login');
  const [method, setMethod] = useState('phone');
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [sent, setSent] = useState(null);       // и-мэйл линк илгээгдсэн: { email, devLink }
  const [otp, setOtp] = useState(null);         // SMS код илгээгдсэн: { phone, devCode, wait }
  const [unverified, setUnverified] = useState(null);
  const [resendMsg, setResendMsg] = useState('');

  if (ready && user) return <Navigate to={next} replace />;

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };
  const switchMode = (m) => { setMode(m); setErrors({}); setError(''); setUnverified(null); };

  /** Утас баталгаажаагүй үед код илгээгээд OTP дэлгэц рүү шилжинэ */
  async function startOtp(phone) {
    try {
      const res = await api.resendOtp(phone);
      setOtp({ phone, devCode: res.devCode, wait: 60 });
    } catch (err) {
      setOtp({ phone, wait: err.body?.wait ?? 0 }); // саяхан илгээсэн бол хүлээлттэй
    }
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErrors({}); setError(''); setUnverified(null);
    try {
      if (mode === 'login') {
        const res = await api.userLogin(form.identifier, form.password);
        login(res.token, res.user);
        nav(next, { replace: true });
      } else {
        const res = await api.register({ method, name: form.name, phone: form.phone, email: form.email, password: form.password });
        if (res.method === 'phone') setOtp({ phone: res.phone, devCode: res.devCode, wait: res.smsError ? 0 : 60, smsError: res.smsError });
        else setSent({ email: res.email, devLink: res.devLink, mailError: res.mailError });
      }
    } catch (err) {
      if (err.body?.code === 'EMAIL_NOT_VERIFIED') setUnverified(err.body.email);
      else if (err.body?.code === 'PHONE_NOT_VERIFIED') await startOtp(err.body.phone);
      else if (err.body?.errors) setErrors(err.body.errors);
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function resendMail(email) {
    setResendMsg('');
    try {
      const res = await api.resendVerification(email);
      setResendMsg('Шинэ линк илгээлээ. И-мэйлээ шалгана уу.');
      if (res.devLink) setSent((s) => ({ ...(s || { email }), devLink: res.devLink }));
    } catch (err) { setResendMsg(err.message); }
  }

  if (otp) {
    return (
      <AuthShell>
        {otp.smsError && <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">SMS илгээхэд алдаа гарлаа. “Код дахин илгээх” товчийг дарна уу.</p>}
        <OtpVerify phone={otp.phone} devCode={otp.devCode} wait={otp.wait}
          onVerified={(res) => { login(res.token, res.user); nav(next, { replace: true }); }}
          onBack={() => { setOtp(null); switchMode('login'); }} />
      </AuthShell>
    );
  }

  if (sent) {
    return (
      <AuthShell>
        <StatusBlock icon="mail" title="И-мэйлээ шалгана уу">
          <p><b className="text-ink">{sent.email}</b> хаяг руу баталгаажуулах линк илгээлээ. Линк дээр дарж бүртгэлээ идэвхжүүлнэ үү.</p>
          {sent.mailError && <p className="font-semibold text-red-700">И-мэйл илгээхэд алдаа гарлаа. Доорх товчоор дахин илгээнэ үү.</p>}
          <p className="text-xs">И-мэйл ирэхгүй бол “Spam” хавтсаа шалгаарай.</p>
          <DevLink href={sent.devLink} />
          {resendMsg && <p role="status" className="font-semibold text-ink">{resendMsg}</p>}
          <button type="button" onClick={() => resendMail(sent.email)} className="btn-white border-2 border-line !py-3">Линк дахин илгээх</button>
          <button type="button" onClick={() => { setSent(null); switchMode('login'); }} className="font-bold text-brand-blue hover:underline">Нэвтрэх хуудас руу</button>
        </StatusBlock>
      </AuthShell>
    );
  }

  const aria = (k) => ({ 'aria-invalid': !!errors[k], 'aria-describedby': errors[k] ? `${k}-err` : undefined });
  const collapse = { initial: { height: 0, opacity: 0 }, animate: { height: 'auto', opacity: 1 }, exit: { height: 0, opacity: 0 }, className: 'overflow-hidden' };

  return (
    <AuthShell>
      <div className="mb-6 grid grid-cols-2 rounded-2xl bg-brand-mist p-1" role="tablist">
        {[['login', 'Нэвтрэх'], ['register', 'Бүртгэл үүсгэх']].map(([k, label]) => (
          <button key={k} role="tab" aria-selected={mode === k} type="button" onClick={() => switchMode(k)}
            className={`relative rounded-xl py-2.5 text-sm font-extrabold transition ${mode === k ? 'text-brand-navy' : 'text-ink-soft hover:text-ink'}`}>
            {mode === k && <motion.span layoutId="tab" className="absolute inset-0 rounded-xl bg-white shadow" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
            <span className="relative">{label}</span>
          </button>
        ))}
      </div>

      <h1 className="text-2xl font-extrabold">{mode === 'login' ? 'Тавтай морил!' : 'Шинэ бүртгэл'}</h1>
      <p className="mb-6 text-sm text-ink-soft">
        {mode === 'login' ? 'Утасны дугаар эсвэл и-мэйл, нууц үгээрээ нэвтэрнэ үү.' : 'Бүртгэлээ баталгаажуулмагц 50 MindPoint бэлэглэнэ!'}
      </p>

      <form onSubmit={submit} noValidate className="grid gap-4">
        {mode === 'login' ? (
          <Field id="identifier" label="Утасны дугаар эсвэл и-мэйл" error={errors.identifier}>
            <input id="identifier" className="input" value={form.identifier} onChange={set('identifier')} autoComplete="username" placeholder="9911 2233 эсвэл name@example.com" />
          </Field>
        ) : (
          <>
            <MethodPicker value={method} onChange={(m) => { setMethod(m); setErrors({}); }} />
            <Field id="name" label="Таны нэр (эцэг эх)" error={errors.name}>
              <input id="name" className={`input ${errors.name ? 'input-error' : ''}`} value={form.name} onChange={set('name')} autoComplete="name" placeholder="Жишээ: Б. Сарангэрэл" {...aria('name')} />
            </Field>
            <AnimatePresence initial={false} mode="popLayout">
              {method === 'email' && (
                <motion.div key="email" {...collapse}>
                  <Field id="email" label="И-мэйл" error={errors.email}>
                    <input id="email" className={`input ${errors.email ? 'input-error' : ''}`} type="email" value={form.email} onChange={set('email')} autoComplete="email" placeholder="name@example.com" {...aria('email')} />
                  </Field>
                </motion.div>
              )}
            </AnimatePresence>
            <Field id="phone" label={method === 'phone' ? 'Утасны дугаар' : 'Утасны дугаар (заавал биш)'} error={errors.phone}
              hint={method === 'phone' ? 'Энэ дугаарт 6 оронтой баталгаажуулах код илгээнэ' : 'Ажилтан тантай холбогдоход ашиглана'}>
              <input id="phone" className={`input ${errors.phone ? 'input-error' : ''}`} type="tel" inputMode="numeric" value={form.phone} onChange={set('phone')} autoComplete="tel" placeholder="9911 2233" maxLength={12} {...aria('phone')} />
            </Field>
          </>
        )}

        <Field id="password" label="Нууц үг" error={errors.password} hint={mode === 'register' ? 'Хамгийн багадаа 6 тэмдэгт' : undefined}>
          <PasswordInput id="password" value={form.password} onChange={set('password')} invalid={!!errors.password}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'} show={show} onToggle={() => setShow((s) => !s)} />
        </Field>

        {mode === 'login' && (
          <Link to="/forgot-password" className="-mt-1 w-fit text-sm font-bold text-brand-blue hover:underline">Нууц үгээ мартсан уу?</Link>
        )}

        <AnimatePresence initial={false}>
          {unverified && (
            <motion.div key="unv" {...collapse}>
              <div className="grid gap-2 rounded-2xl bg-brand-yellow/15 p-4 text-sm">
                <p className="font-semibold">И-мэйл хаяг тань баталгаажаагүй байна. <b>{unverified}</b> хаяг руу илгээсэн линк дээр дарна уу.</p>
                {resendMsg && <p role="status" className="font-semibold">{resendMsg}</p>}
                <button type="button" onClick={() => resendMail(unverified)} className="w-fit font-bold text-brand-blue hover:underline">Линк дахин илгээх</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

        <button className="btn-blue mt-2" disabled={busy}>
          {busy ? 'Түр хүлээнэ үү…' : mode === 'login' ? 'Нэвтрэх' : method === 'phone' ? 'Код авах' : 'Бүртгэл үүсгэх'}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-ink-soft">
        {mode === 'login' ? 'Бүртгэлгүй юу? ' : 'Бүртгэлтэй юу? '}
        <button type="button" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')} className="font-bold text-brand-blue hover:underline">
          {mode === 'login' ? 'Бүртгэл үүсгэх' : 'Нэвтрэх'}
        </button>
      </p>
    </AuthShell>
  );
}
