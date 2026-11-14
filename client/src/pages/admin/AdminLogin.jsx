import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api, auth } from '../../lib/api';
import { Logo, Ring } from '../../components/ui/common';

export default function AdminLogin() {
  const nav = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const { token } = await api.login(username, password);
      auth.set(token);
      nav('/admin', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-grid-blue relative grid min-h-screen place-items-center overflow-hidden p-4">
      <Ring className="-right-40 -top-40 h-[460px] w-[460px]" />
      <motion.form onSubmit={submit} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        className="relative grid w-full max-w-sm gap-5 rounded-4xl bg-white p-8 shadow-2xl shadow-brand-navy/40">
        <div className="mb-2 rounded-2xl bg-brand-blue px-5 py-4 text-white"><Logo /></div>
        <div>
          <h1 className="text-2xl font-extrabold">Админ нэвтрэх</h1>
          <p className="text-sm text-ink-soft">Бүртгэлийн хүсэлтүүдийг удирдах</p>
        </div>
        <label className="grid gap-1.5 text-sm font-bold">Нэвтрэх нэр
          <input className="input" id="admin-user" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
        </label>
        <label className="grid gap-1.5 text-sm font-bold">Нууц үг
          <input className="input" id="admin-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </label>
        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
        <button className="btn-blue" disabled={busy}>{busy ? 'Шалгаж байна…' : 'Нэвтрэх'}</button>
        <Link to="/" className="text-center text-sm font-semibold text-brand-blue hover:underline">← Сайт руу буцах</Link>
      </motion.form>
    </div>
  );
}
