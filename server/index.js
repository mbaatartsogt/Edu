import './env.js';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { initDb, enrollments, pool, STATUSES } from './db.js';
import { chats, sanitizeChat, CHAT_STATUSES } from './chats.js';
import { users, orders, tokens, otps, sanitizeRegister, verifyPassword } from './accounts.js';
import { smsEnabled, sendSms } from './sms.js';
import { weatherFor } from './weather.js';
import { points, PointsError } from './points.js';
import { mailEnabled, sendVerifyEmail, sendResetEmail } from './mailer.js';
import { QPAY_MODE, isDemo, createInvoice, isInvoicePaid, cancelInvoice } from './qpay.js';
import { content, settings, images, sanitize, sanitizeSettings, isResource, seedContent } from './content.js';
import { saveUpload, getVideo, videoFilePath, uploadedVideoId, cleanupOrphanVideos, UploadError, VIDEO_MAX_MB } from './videos.js';
import { track, dashboard, pruneViews } from './analytics.js';
import { lessonsForUser, lessonForUser, saveProgress, lessonStats } from './lessons.js';

// Express 4 нь async алдааг өөрөө барьдаггүй тул ороож өгнө
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 4000;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'mindedu2026';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';
const SCHEDULES = ['mwf-day', 'tts-evening', 'mwf-evening'];
// QPay callback илгээх нийтийн хаяг (жишээ: https://mindedu.mn)
const PUBLIC_URL = (process.env.PUBLIC_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
// И-мэйлийн линкүүд нээгдэх сайтын хаяг (dev үед Vite-ийн 5173 порт)
const APP_URL = (process.env.APP_URL || process.env.PUBLIC_URL || 'http://localhost:5173').replace(/\/$/, '');
// SMTP байхгүй, production биш үед линкийг API хариунд буцааж туршихад хялбар болгоно
// SHOW_DEV_CODES=true — SMTP/SMS тохируулаагүй үзүүлэнгийн сайтад код, линкийг дэлгэц дээр харуулна (жинхэнэ ажиллагаанд унтраана)
const showDevCodes = process.env.NODE_ENV !== 'production' || process.env.SHOW_DEV_CODES === 'true';
const exposeDevLinks = !mailEnabled && showDevCodes;
const exposeDevCodes = !smsEnabled && showDevCodes;
const VERIFY_TTL = 24 * 3600_000;
const RESET_TTL = 3600_000;

if (!process.env.ADMIN_PASSWORD || !process.env.JWT_SECRET) {
  console.warn('⚠️  ADMIN_PASSWORD / JWT_SECRET тохируулаагүй байна. server/.env файлд заавал солиорой.');
}

const app = express();
app.disable('x-powered-by');
// Зураг upload хийх маршрутад том хэмжээ, бусдад жижиг хязгаар
const jsonSmall = express.json({ limit: '100kb' });
const jsonLarge = express.json({ limit: '8mb' });
app.use((req, res, next) => (req.path === '/api/admin/images' ? jsonLarge : jsonSmall)(req, res, next));
if (process.env.CORS_ORIGIN) app.use(cors({ origin: process.env.CORS_ORIGIN.split(',') }));

// ---------- Энгийн rate limiter (IP тус бүрээр) ----------
function rateLimit({ windowMs, max }) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip;
    const rec = hits.get(key) ?? { count: 0, reset: now + windowMs };
    if (now > rec.reset) { rec.count = 0; rec.reset = now + windowMs; }
    rec.count++;
    hits.set(key, rec);
    if (rec.count > max) return res.status(429).json({ error: 'Хэт олон хүсэлт илгээлээ. Түр хүлээгээд дахин оролдоно уу.' });
    next();
  };
}

const safeEqual = (a, b) => {
  const ba = Buffer.from(String(a)), bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
};

function verifyRole(role) {
  return (req, res, next) => {
    const token = (req.headers.authorization || '').replace(/^Bearer /, '');
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      if (payload.role !== role) throw new Error('role');
      if (role === 'admin') req.admin = payload; else req.userId = payload.sub;
      next();
    } catch {
      res.status(401).json({ error: 'Нэвтрэх шаардлагатай.' });
    }
  };
}
const requireAdmin = verifyRole('admin');
const requireUser = verifyRole('user');
// UUID биш id ирвэл PostgreSQL алдаа өгөхөөс өмнө 404 буцаана
app.param('id', (req, res, next, id) => (UUID_RE.test(id) ? next() : res.status(404).json({ error: 'Олдсонгүй.' })));

const userToken = (u) => jwt.sign({ sub: u.id, role: 'user' }, JWT_SECRET, { expiresIn: '30d' });

// ---------- Public ----------
app.get('/api/health', ah(async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ ok: true, db: 'up' });
}));

app.post('/api/enrollments', rateLimit({ windowMs: 10 * 60_000, max: 10 }), ah(async (req, res) => {
  const { childName, age, phone, schedule, website } = req.body ?? {};
  if (website) return res.status(201).json({ ok: true }); // honeypot (спам бот)

  const errors = {};
  const name = String(childName ?? '').trim();
  const ageNum = Number(age);
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (name.length < 2 || name.length > 60) errors.childName = 'Хүүхдийн нэрийг оруулна уу.';
  if (!Number.isInteger(ageNum) || ageNum < 8 || ageNum > 18) errors.age = 'Нас 8-18 хооронд байна.';
  if (digits.length !== 8) errors.phone = '8 оронтой утасны дугаар оруулна уу.';
  if (!SCHEDULES.includes(schedule)) errors.schedule = 'Хуваарь сонгоно уу.';
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  const item = await enrollments.create({ childName: name, age: ageNum, phone: digits, schedule });
  res.status(201).json({ ok: true, id: item.id });
}));

// ---------- Admin ----------
app.post('/api/auth/login', rateLimit({ windowMs: 15 * 60_000, max: 20 }), (req, res) => {
  const { username, password } = req.body ?? {};
  if (!safeEqual(username, ADMIN_USERNAME) || !safeEqual(password, ADMIN_PASSWORD)) {
    return res.status(401).json({ error: 'Нэвтрэх нэр эсвэл нууц үг буруу байна.' });
  }
  const token = jwt.sign({ sub: ADMIN_USERNAME, role: 'admin' }, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token, username: ADMIN_USERNAME });
});

app.get('/api/auth/me', requireAdmin, (req, res) => res.json({ username: req.admin.sub }));

app.get('/api/admin/enrollments', requireAdmin, ah(async (_req, res) => res.json(await enrollments.list())));

// ---------- Хэрэглэгч (эцэг эх) ----------
async function sendVerification(user) {
  const raw = await tokens.create(user.id, 'verify', VERIFY_TTL);
  const link = `${APP_URL}/verify-email?token=${raw}`;
  await sendVerifyEmail(user, link);
  return exposeDevLinks ? { devLink: link } : {};
}

/** OTP код илгээнэ. Хэт ойр/олон удаа илгээхийг хязгаарлана */
async function sendOtp(user, phone, purpose) {
  const { since, hour } = await otps.sendStats(phone, purpose);
  if (since !== null && since < 60) return { error: `Шинэ код авахын тулд ${60 - since} секунд хүлээнэ үү.`, status: 429, wait: 60 - since };
  if (hour >= 5) return { error: 'Нэг цагт 5-аас олон код авах боломжгүй. Түр хүлээгээд оролдоно уу.', status: 429 };
  const code = await otps.create(user.id, phone, purpose);
  const text = purpose === 'verify'
    ? `MindEdu баталгаажуулах код: ${code}. 5 минут хүчинтэй. Кодыг хэнд ч бүү хэл.`
    : `MindEdu нууц үг сэргээх код: ${code}. 5 минут хүчинтэй. Та хүсэлт илгээгээгүй бол үл тоомсорлоно уу.`;
  await sendSms(phone, text);
  return exposeDevCodes ? { devCode: code } : {};
}

app.post('/api/account/register', rateLimit({ windowMs: 15 * 60_000, max: 10 }), ah(async (req, res) => {
  const { data, errors } = sanitizeRegister(req.body);
  if (Object.keys(errors).length) return res.status(400).json({ errors });
  const user = await users.create(data);
  if (user.conflict === 'email') return res.status(409).json({ errors: { email: 'Энэ и-мэйлээр бүртгэл үүссэн байна. Нэвтэрнэ үү.' } });
  if (user.conflict === 'phone') return res.status(409).json({ errors: { phone: 'Энэ дугаараар бүртгэл үүссэн байна. Нэвтэрнэ үү.' } });
  let extra = {};
  if (data.method === 'phone') {
    try { extra = await sendOtp(user, user.phone, 'verify'); }
    catch (e) { console.error('SMS илгээх алдаа:', e.message); extra = { smsError: true }; }
    return res.status(201).json({ ok: true, method: 'phone', phone: user.phone, ...extra });
  }
  try { extra = await sendVerification(user); }
  catch (e) { console.error('И-мэйл илгээх алдаа:', e.message); extra = { mailError: true }; }
  res.status(201).json({ ok: true, method: 'email', email: user.email, ...extra });
}));

app.post('/api/account/login', rateLimit({ windowMs: 15 * 60_000, max: 20 }), ah(async (req, res) => {
  const identifier = String(req.body?.identifier ?? req.body?.phone ?? '');
  const found = await users.findForLogin(identifier);
  if (!found || !(await verifyPassword(String(req.body?.password ?? ''), found.password_hash))) {
    return res.status(401).json({ error: 'И-мэйл / утас эсвэл нууц үг буруу байна.' });
  }
  const { password_hash: _, ...user } = found;
  if (!user.verified) {
    // И-мэйлээр нэвтэрсэн бол линк, бусад үед SMS код
    if (user.email && (identifier.includes('@') || !user.phone)) {
      return res.status(403).json({ code: 'EMAIL_NOT_VERIFIED', email: user.email, error: 'И-мэйл хаяг баталгаажаагүй байна. Танд илгээсэн линк дээр дарж баталгаажуулна уу.' });
    }
    return res.status(403).json({ code: 'PHONE_NOT_VERIFIED', phone: user.phone, error: 'Утасны дугаар баталгаажаагүй байна. SMS-ээр ирсэн кодыг оруулна уу.' });
  }
  res.json({ token: userToken(user), user });
}));

// ---------- SMS OTP ----------
app.post('/api/account/resend-otp', rateLimit({ windowMs: 15 * 60_000, max: 10 }), ah(async (req, res) => {
  const purpose = req.body?.purpose === 'reset' ? 'reset' : 'verify';
  const user = await users.findByPhone(req.body?.phone);
  // Бүртгэл байгаа эсэхийг задруулахгүйн тулд үргэлж ok буцаана
  if (!user || (purpose === 'verify' && user.verified)) return res.json({ ok: true });
  try {
    const r = await sendOtp(user, user.phone, purpose);
    if (r.error) return res.status(r.status).json({ error: r.error, wait: r.wait });
    res.json({ ok: true, ...r });
  } catch (e) { console.error('SMS илгээх алдаа:', e.message); res.status(502).json({ error: 'SMS илгээж чадсангүй. Түр хүлээгээд дахин оролдоно уу.' }); }
}));

app.post('/api/account/verify-otp', rateLimit({ windowMs: 15 * 60_000, max: 30 }), ah(async (req, res) => {
  const phone = String(req.body?.phone ?? '').replace(/\D/g, '');
  const r = await otps.verify(phone, 'verify', req.body?.code);
  if (r.error) return res.status(400).json({ error: r.error });
  if (await users.markPhoneVerified(r.userId)) await points.signupBonus(r.userId);
  const user = await users.get(r.userId);
  res.json({ token: userToken(user), user });
}));

app.post('/api/account/reset-phone', rateLimit({ windowMs: 15 * 60_000, max: 15 }), ah(async (req, res) => {
  const phone = String(req.body?.phone ?? '').replace(/\D/g, '');
  const password = String(req.body?.password ?? '');
  if (password.length < 6 || password.length > 200) return res.status(400).json({ errors: { password: 'Нууц үг хамгийн багадаа 6 тэмдэгт байна.' } });
  const r = await otps.verify(phone, 'reset', req.body?.code);
  if (r.error) return res.status(400).json({ errors: { code: r.error } });
  await users.setPassword(r.userId, password);
  if (await users.markPhoneVerified(r.userId)) await points.signupBonus(r.userId);
  const user = await users.get(r.userId);
  res.json({ token: userToken(user), user });
}));

// Баталгаажуулах линкийг дахин илгээх (бүртгэл байгаа эсэхийг задруулахгүй)
app.post('/api/account/resend-verification', rateLimit({ windowMs: 15 * 60_000, max: 5 }), ah(async (req, res) => {
  const user = await users.findByEmail(req.body?.email);
  let extra = {};
  if (user && !user.emailVerified) {
    const since = await tokens.secondsSinceLast(user.id, 'verify');
    if (since !== null && since < 60) return res.status(429).json({ error: 'Түр хүлээгээд (1 минут) дахин оролдоно уу.' });
    try { extra = await sendVerification(user); } catch (e) { console.error(e.message); }
  }
  res.json({ ok: true, ...extra });
}));

app.post('/api/account/verify', rateLimit({ windowMs: 15 * 60_000, max: 30 }), ah(async (req, res) => {
  const userId = await tokens.consume(req.body?.token, 'verify');
  if (!userId) return res.status(400).json({ error: 'Линк хүчингүй эсвэл хугацаа нь дууссан байна. Шинэ линк авна уу.' });
  if (await users.markVerified(userId)) await points.signupBonus(userId);
  const user = await users.get(userId);
  res.json({ token: userToken(user), user });
}));

app.post('/api/account/forgot', rateLimit({ windowMs: 15 * 60_000, max: 5 }), ah(async (req, res) => {
  const user = await users.findByEmail(req.body?.email);
  let extra = {};
  if (user) {
    const since = await tokens.secondsSinceLast(user.id, 'reset');
    if (since === null || since >= 60) {
      const raw = await tokens.create(user.id, 'reset', RESET_TTL);
      const link = `${APP_URL}/reset-password?token=${raw}`;
      try { await sendResetEmail(user, link); if (exposeDevLinks) extra = { devLink: link }; }
      catch (e) { console.error('И-мэйл илгээх алдаа:', e.message); }
    }
  }
  // Бүртгэл байгаа эсэхээс үл хамааран ижил хариу өгнө
  res.json({ ok: true, ...extra });
}));

app.post('/api/account/reset', rateLimit({ windowMs: 15 * 60_000, max: 10 }), ah(async (req, res) => {
  const password = String(req.body?.password ?? '');
  if (password.length < 6 || password.length > 200) return res.status(400).json({ errors: { password: 'Нууц үг хамгийн багадаа 6 тэмдэгт байна.' } });
  const userId = await tokens.consume(req.body?.token, 'reset');
  if (!userId) return res.status(400).json({ error: 'Линк хүчингүй эсвэл хугацаа нь дууссан байна. Дахин хүсэлт илгээнэ үү.' });
  await users.setPassword(userId, password);
  // И-мэйлээ нээж чадсан тул баталгаажсан гэж үзнэ
  if (await users.markVerified(userId)) await points.signupBonus(userId);
  const user = await users.get(userId);
  res.json({ token: userToken(user), user });
}));

app.get('/api/account/me', requireUser, ah(async (req, res) => {
  const user = await users.get(req.userId);
  if (!user) return res.status(401).json({ error: 'Нэвтрэх шаардлагатай.' });
  const [list, bal] = await Promise.all([orders.listByUser(req.userId), points.balance(req.userId)]);
  res.json({ user: { ...user, points: bal }, orders: list, paymentMode: QPAY_MODE });
}));

// ---------- MindPoint ----------
app.get('/api/account/points', requireUser, ah(async (req, res) => {
  const [bal, history, redemptions, rewards, s] = await Promise.all([
    points.balance(req.userId), points.history(req.userId), points.redemptionsByUser(req.userId),
    content.rewards.list({ onlyVisible: true }), settings.get(),
  ]);
  res.json({ balance: bal, history, redemptions, rewards, rules: { per1000: Number(s.pointsPer1000) || 0, signup: Number(s.pointsSignup) || 0 } });
}));

app.post('/api/account/rewards/:id/redeem', requireUser, rateLimit({ windowMs: 10 * 60_000, max: 20 }), ah(async (req, res) => {
  try { res.status(201).json(await points.redeem(req.userId, req.params.id)); }
  catch (e) { if (e instanceof PointsError) return res.status(e.status).json({ error: e.message }); throw e; }
}));

/** Захиалгад QPay нэхэмжлэх үүсгэнэ (амжилтгүй бол захиалга хэвээр, дараа дахин оролдоно) */
async function ensureInvoice(order) {
  if (order.invoiceId || order.status !== 'pending') return order;
  const inv = await createInvoice({
    orderNo: order.orderNo,
    amount: order.amount,
    description: `MindEdu ${order.items?.length > 1 ? `${order.items.length} хөтөлбөр` : order.programTitle} - ${order.childName} (${order.orderNo})`,
    callbackUrl: `${PUBLIC_URL}/api/payments/qpay/callback?order=${order.id}`,
  });
  return orders.attachInvoice(order.id, inv.invoiceId, inv);
}

/** pending → paid болгож, амжилттай шилжсэн бол оноо нэмнэ (давхар оноо өгөхгүй) */
async function markPaidWithPoints(id) {
  const paid = await orders.markPaid(id);
  if (paid) await points.earnForOrder(paid).catch((e) => console.error('Оноо нэмэх алдаа:', e.message));
  return paid;
}

/** Төлөгдсөн эсэхийг QPay-аас шалгаж шинэчилнэ */
async function syncPayment(order) {
  if (order.status !== 'pending' || !order.invoiceId || isDemo) return order;
  try {
    if (await isInvoicePaid(order.invoiceId, order.amount)) return (await markPaidWithPoints(order.id)) ?? (await orders.get(order.id));
  } catch (e) { console.error('QPay шалгах алдаа:', e.message); }
  return order;
}

async function ownOrder(req, res) {
  const order = await orders.get(req.params.id);
  if (!order || order.userId !== req.userId) { res.status(404).json({ error: 'Захиалга олдсонгүй.' }); return null; }
  return order;
}

// Сагсны хөтөлбөрүүдийг нэг захиалга, нэг төлбөр болгоно
app.post('/api/account/orders', requireUser, rateLimit({ windowMs: 10 * 60_000, max: 15 }), ah(async (req, res) => {
  const body = req.body ?? {};
  // Хуучин (нэг хөтөлбөртэй) хүсэлтийг ч дэмжинэ
  const raw = Array.isArray(body.items) ? body.items : [{ programId: body.programId, childName: body.childName, childAge: body.childAge, branchId: body.branchId }];
  if (!raw.length) return res.status(400).json({ error: 'Сагс хоосон байна.' });
  if (raw.length > 10) return res.status(400).json({ error: 'Нэг удаад 10 хүртэлх хөтөлбөр төлнө.' });

  const [programs, branches] = await Promise.all([content.programs.list({ onlyVisible: true }), content.branches.list({ onlyVisible: true })]);
  const itemErrors = [];
  const items = raw.map((it, idx) => {
    const e = {};
    const program = programs.find((p) => p.id === it?.programId);
    const childName = String(it?.childName ?? '').trim().slice(0, 60);
    const childAge = Number(it?.childAge);
    if (!program) e.programId = 'Хөтөлбөр олдсонгүй. Сагснаас хасна уу.';
    else if (!program.price) e.programId = 'Энэ хөтөлбөрийн үнэ тохируулагдаагүй байна.';
    if (childName.length < 2) e.childName = 'Хүүхдийн нэрийг оруулна уу.';
    if (!Number.isInteger(childAge) || childAge < 3 || childAge > 25) e.childAge = 'Насыг сонгоно уу.';
    let branch = null;
    if (it?.branchId) {
      branch = branches.find((b) => b.id === it.branchId);
      if (!branch) e.branchId = 'Салбар олдсонгүй.';
    } else if (branches.length) e.branchId = 'Салбараа сонгоно уу.';
    itemErrors[idx] = Object.keys(e).length ? e : null;
    return program && {
      programId: program.id, programTitle: program.title, programAge: program.age, amount: program.price,
      branchId: branch?.id ?? null, branchName: branch ? [branch.name, branch.region].filter(Boolean).join(' ') : '',
      childName, childAge,
    };
  });
  if (itemErrors.some(Boolean)) return res.status(400).json({ errors: { items: itemErrors } });

  let order = await orders.createWithItems(req.userId, items);
  try { order = await ensureInvoice(order); } catch (e) { console.error('QPay нэхэмжлэх алдаа:', e.message); }
  res.status(201).json(order);
}));

app.get('/api/account/orders/:id', requireUser, ah(async (req, res) => {
  const order = await ownOrder(req, res);
  if (order) res.json({ ...(await syncPayment(order)), paymentMode: QPAY_MODE });
}));

app.post('/api/account/orders/:id/invoice', requireUser, ah(async (req, res) => {
  const order = await ownOrder(req, res);
  if (!order) return;
  try { res.json(await ensureInvoice(order)); }
  catch (e) { console.error(e.message); res.status(502).json({ error: 'Төлбөрийн систем түр ажиллахгүй байна. Дараа дахин оролдоно уу.' }); }
}));

app.post('/api/account/orders/:id/cancel', requireUser, ah(async (req, res) => {
  const order = await ownOrder(req, res);
  if (!order) return;
  if (order.status !== 'pending') return res.status(400).json({ error: 'Зөвхөн төлөгдөөгүй захиалгыг цуцална.' });
  await cancelInvoice(order.invoiceId);
  res.json(await orders.setStatus(order.id, 'cancelled'));
}));

// Туршилтын горим: жинхэнэ төлбөргүйгээр "төлсөн" болгоно
app.post('/api/account/orders/:id/demo-pay', requireUser, ah(async (req, res) => {
  if (!isDemo) return res.status(404).json({ error: 'Not found' });
  const order = await ownOrder(req, res);
  if (order) res.json((await markPaidWithPoints(order.id)) ?? order);
}));

// QPay төлбөр орох үед энд мэдэгдэнэ. Аюулгүйн үүднээс QPay-аас дахин шалгаж баталгаажуулна.
app.all('/api/payments/qpay/callback', ah(async (req, res) => {
  const id = String(req.query.order || '');
  if (UUID_RE.test(id)) {
    const order = await orders.get(id);
    if (order) await syncPayment(order);
  }
  res.status(200).send('SUCCESS');
}));

app.get('/api/admin/stats', requireAdmin, ah(async (_req, res) => {
  const [stats, chatsNew, redemptionsPending] = await Promise.all([enrollments.stats(), chats.countNew(), points.pendingRedemptions()]);
  res.json({ ...stats, chatsNew, redemptionsPending });
}));


app.patch('/api/admin/enrollments/:id', requireAdmin, ah(async (req, res) => {
  const patch = {};
  if (req.body.status !== undefined) {
    if (!STATUSES.includes(req.body.status)) return res.status(400).json({ error: 'Буруу төлөв.' });
    patch.status = req.body.status;
  }
  if (req.body.note !== undefined) patch.note = String(req.body.note).slice(0, 500);
  const item = await enrollments.update(req.params.id, patch);
  if (!item) return res.status(404).json({ error: 'Олдсонгүй.' });
  res.json(item);
}));

app.delete('/api/admin/enrollments/:id', requireAdmin, ah(async (req, res) => {
  const ok = await enrollments.remove(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Олдсонгүй.' });
  res.status(204).end();
}));

// ---------- Чат-бот ----------
app.post('/api/chats', rateLimit({ windowMs: 10 * 60_000, max: 8 }), ah(async (req, res) => {
  const { data, errors } = sanitizeChat(req.body);
  if (Object.keys(errors).length) return res.status(400).json({ errors });
  const item = await chats.create(data);
  res.status(201).json({ ok: true, id: item.id });
}));

app.get('/api/admin/chats', requireAdmin, ah(async (_req, res) => res.json(await chats.list())));

app.patch('/api/admin/chats/:id', requireAdmin, ah(async (req, res) => {
  const patch = {};
  if (req.body.status !== undefined) {
    if (!CHAT_STATUSES.includes(req.body.status)) return res.status(400).json({ error: 'Буруу төлөв.' });
    patch.status = req.body.status;
  }
  if (req.body.note !== undefined) patch.note = String(req.body.note).slice(0, 500);
  const item = await chats.update(req.params.id, patch);
  if (!item) return res.status(404).json({ error: 'Олдсонгүй.' });
  res.json(item);
}));

app.get('/api/admin/orders', requireAdmin, ah(async (_req, res) => {
  const [list, stats] = await Promise.all([orders.listAll(), orders.stats()]);
  res.json({ orders: list.map(({ payment, ...o }) => o), stats, paymentMode: QPAY_MODE });
}));

app.patch('/api/admin/orders/:id', requireAdmin, ah(async (req, res) => {
  const { status, note } = req.body ?? {};
  if (status !== undefined && !['pending', 'paid', 'cancelled'].includes(status)) return res.status(400).json({ error: 'Буруу төлөв.' });
  const before = await orders.get(req.params.id);
  if (!before) return res.status(404).json({ error: 'Олдсонгүй.' });
  const order = await orders.setStatus(req.params.id, status, note === undefined ? undefined : String(note).slice(0, 500));
  if (before.status !== 'paid' && order.status === 'paid') await points.earnForOrder(order);
  if (before.status === 'paid' && order.status !== 'paid') await points.reverseForOrder(order);
  const { payment, ...rest } = order;
  res.json(rest);
}));

app.get('/api/admin/users', requireAdmin, ah(async (_req, res) => res.json(await users.listWithPoints())));

app.get('/api/admin/users/:id/points', requireAdmin, ah(async (req, res) => {
  res.json({ balance: await points.balance(req.params.id), history: await points.history(req.params.id) });
}));

app.post('/api/admin/users/:id/points', requireAdmin, ah(async (req, res) => {
  const amount = Number(req.body?.amount);
  const reason = String(req.body?.reason ?? '').trim().slice(0, 200);
  if (!Number.isInteger(amount) || amount === 0 || Math.abs(amount) > 1_000_000) return res.status(400).json({ errors: { amount: 'Тэгээс ялгаатай бүхэл тоо оруулна уу.' } });
  if (!reason) return res.status(400).json({ errors: { reason: 'Шалтгаанаа бичнэ үү.' } });
  if (!(await users.get(req.params.id))) return res.status(404).json({ error: 'Хэрэглэгч олдсонгүй.' });
  try { res.json({ balance: await points.adminAdjust(req.params.id, amount, reason) }); }
  catch (e) { if (e instanceof PointsError) return res.status(e.status).json({ error: e.message }); throw e; }
}));

// Хөтөлбөр бүрийн сурагчид: хүүхэд бүрийн сүүлийн төлбөр (төлсөн нь давуу), дараагийн төлбөр хүртэлх хугацаа
app.get('/api/admin/program-students', requireAdmin, ah(async (_req, res) => {
  const [programs, { rows }] = await Promise.all([
    content.programs.list(),
    pool.query(`
      SELECT DISTINCT ON (COALESCE(i.program_id::text, i.program_title), o.user_id, lower(i.child_name))
        i.id, i.program_id AS "programId", i.program_title AS "programTitle", i.child_name AS "childName", i.child_age AS "childAge",
        i.branch_id AS "branchId", i.branch_name AS "branchName", i.amount,
        o.id AS "orderId", o.order_no AS "orderNo", o.status, o.paid_at AS "paidAt", o.created_at AS "createdAt",
        u.id AS "userId", u.name AS "parentName", u.phone AS "parentPhone", u.email AS "parentEmail",
        (SELECT count(*) FROM order_items i2 JOIN orders o2 ON o2.id = i2.order_id
          WHERE o2.status = 'paid' AND o2.user_id = o.user_id AND lower(i2.child_name) = lower(i.child_name)
            AND COALESCE(i2.program_id::text, i2.program_title) = COALESCE(i.program_id::text, i.program_title))::int AS "paidCount"
      FROM order_items i
      JOIN orders o ON o.id = i.order_id
      JOIN users u ON u.id = o.user_id
      WHERE o.status IN ('paid', 'pending')
      ORDER BY COALESCE(i.program_id::text, i.program_title), o.user_id, lower(i.child_name),
               (o.status = 'paid') DESC, COALESCE(o.paid_at, o.created_at) DESC`),
  ]);
  res.json({ programs, students: rows, now: new Date().toISOString() });
}));

app.get('/api/admin/redemptions', requireAdmin, ah(async (_req, res) => res.json(await points.allRedemptions())));

app.patch('/api/admin/redemptions/:id', requireAdmin, ah(async (req, res) => {
  const { status, note } = req.body ?? {};
  if (status !== undefined && !['pending', 'fulfilled', 'cancelled'].includes(status)) return res.status(400).json({ error: 'Буруу төлөв.' });
  try { res.json(await points.setRedemptionStatus(req.params.id, status, note === undefined ? undefined : String(note).slice(0, 500))); }
  catch (e) { if (e instanceof PointsError) return res.status(e.status).json({ error: e.message }); throw e; }
}));

app.delete('/api/admin/chats/:id', requireAdmin, ah(async (req, res) => {
  if (!(await chats.remove(req.params.id))) return res.status(404).json({ error: 'Олдсонгүй.' });
  res.status(204).end();
}));

// ---------- Хандалтын статистик ----------
app.post('/api/track', rateLimit({ windowMs: 60_000, max: 120 }), ah(async (req, res) => {
  let userId = null;
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  if (token) { try { const p = jwt.verify(token, JWT_SECRET); if (p.role === 'user') userId = p.sub; } catch { /* ignore */ } }
  const { vid, path: p, ref } = req.body ?? {};
  await track({ visitorId: vid, userId, path: p, referrer: ref, ua: req.headers['user-agent'], host: req.headers.host });
  res.status(204).end();
}));

app.get('/api/admin/analytics', requireAdmin, ah(async (req, res) => {
  const days = [7, 14, 30, 90, 180, 365].includes(Number(req.query.days)) ? Number(req.query.days) : 30;
  res.set('Cache-Control', 'no-store');
  res.json(await dashboard(days));
}));

// ---------- Видео хичээл ----------
// <video> таг Authorization header илгээж чаддаггүй тул богино хугацааны токенийг URL-д залгана
const videoSrc = (videoId, sub) => `/api/videos/${videoId}?t=${jwt.sign({ sub, role: 'video', vid: videoId }, JWT_SECRET, { expiresIn: '6h' })}`;

app.get('/api/account/lessons', requireUser, ah(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(await lessonsForUser(req.userId));
}));

app.get('/api/account/lessons/:id', requireUser, ah(async (req, res) => {
  const data = await lessonForUser(req.userId, req.params.id);
  if (!data) return res.status(404).json({ error: 'Хичээл олдсонгүй.' });
  if (data.player?.uploaded) data.player.src = videoSrc(uploadedVideoId(data.player.src), req.userId);
  res.set('Cache-Control', 'no-store');
  res.json(data);
}));

app.post('/api/account/lessons/:id/progress', requireUser, rateLimit({ windowMs: 60_000, max: 60 }), ah(async (req, res) => {
  const data = await lessonForUser(req.userId, req.params.id);
  if (!data) return res.status(404).json({ error: 'Хичээл олдсонгүй.' });
  if (!data.lesson.canWatch) return res.status(403).json({ code: 'LOCKED', error: 'Энэ хичээлийг үзэх эрх алга.' });
  res.json(await saveProgress(req.userId, req.params.id, req.body ?? {}));
}));

// Видео тоглуулах (Range дэмжинэ — гүйлгэж үзэх боломжтой)
app.get('/api/videos/:id', ah(async (req, res) => {
  try {
    const p = jwt.verify(String(req.query.t || ''), JWT_SECRET);
    if (p.role !== 'video' || p.vid !== req.params.id) throw new Error('vid');
  } catch {
    return res.status(403).json({ error: 'Видео үзэх хугацаа дууссан байна. Хуудсаа дахин ачаална уу.' });
  }
  const video = await getVideo(req.params.id);
  if (!video) return res.status(404).end();
  res.sendFile(videoFilePath(video.id, video.mime), {
    headers: { 'Cache-Control': 'private, max-age=3600', 'Content-Disposition': 'inline', 'X-Content-Type-Options': 'nosniff' },
  }, (err) => { if (err && !res.headersSent) res.status(err.status === 404 ? 404 : 500).end(); });
}));

// Админ: видео файл хуулах (биеийг шууд дискэнд урсгана)
app.post('/api/admin/videos', requireAdmin, ah(async (req, res) => {
  const mime = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  let name = '';
  try { name = decodeURIComponent(String(req.headers['x-file-name'] || '')); } catch { /* ignore */ }
  try {
    res.status(201).json(await saveUpload(req, { mime, name }));
  } catch (e) {
    if (!(e instanceof UploadError)) throw e;
    res.set('Connection', 'close').status(e.status).json({ error: e.message });
  }
}));

app.get('/api/admin/videos/:id/play', requireAdmin, ah(async (req, res) => {
  const video = await getVideo(req.params.id);
  if (!video) return res.status(404).json({ error: 'Видео файл олдсонгүй.' });
  res.json({ src: videoSrc(video.id, 'admin'), name: video.name, size: Number(video.size) });
}));

app.get('/api/admin/lessons/stats', requireAdmin, ah(async (_req, res) => {
  res.json({ stats: await lessonStats(), maxUploadMb: VIDEO_MAX_MB });
}));

// ---------- Сайтын контент ----------
// Нүүр хуудас нэг хүсэлтээр бүх контентоо авна
app.get('/api/content', ah(async (_req, res) => {
  const [s, programs, teachers, branches] = await Promise.all([
    settings.get(),
    content.programs.list({ onlyVisible: true }),
    content.teachers.list({ onlyVisible: true }),
    content.branches.list({ onlyVisible: true }),
  ]);
  const faqs = (await content.faqs.list({ onlyVisible: true })).map(({ id, question, keywords, answer, collectLead }) => ({ id, question, keywords, answer, collectLead }));
  res.set('Cache-Control', 'no-cache');
  res.json({ settings: s, programs, teachers, branches, faqs });
}));

app.get('/api/weather', ah(async (_req, res) => {
  const s = await settings.get();
  res.set('Cache-Control', 'no-cache'); // админ горим солиход шууд харагдана (сервер өөрөө 15 мин кэшлэнэ)
  res.json(await weatherFor(s.weatherMode || 'auto'));
}));

app.get('/api/images/:id', ah(async (req, res) => {
  const img = await images.get(req.params.id);
  if (!img) return res.status(404).end();
  res.set({ 'Content-Type': img.mime, 'Cache-Control': 'public, max-age=31536000, immutable' });
  res.send(img.data);
}));

app.post('/api/admin/images', requireAdmin, ah(async (req, res) => {
  const m = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(req.body?.dataUrl || '');
  if (!m) return res.status(400).json({ error: 'PNG, JPG эсвэл WEBP зураг оруулна уу.' });
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 5 * 1024 * 1024) return res.status(413).json({ error: 'Зураг 5MB-аас бага байх ёстой.' });
  res.status(201).json(await images.create(m[1], buf));
}));

app.get('/api/admin/settings', requireAdmin, ah(async (_req, res) => res.json(await settings.get())));
app.put('/api/admin/settings', requireAdmin, ah(async (req, res) => {
  const { data, errors } = sanitizeSettings(req.body);
  if (Object.keys(errors).length) return res.status(400).json({ errors });
  res.json(await settings.save(data));
}));

// programs | teachers | branches — ижил CRUD
const resourceParam = (req, res, next) => (isResource(req.params.resource) ? next() : res.status(404).json({ error: 'Not found' }));
const R = '/api/admin/content/:resource';

app.get(R, requireAdmin, resourceParam, ah(async (req, res) => res.json(await content[req.params.resource].list())));

app.post(R, requireAdmin, resourceParam, ah(async (req, res) => {
  const { data, errors } = sanitize(req.params.resource, req.body);
  if (Object.keys(errors).length) return res.status(400).json({ errors });
  try { res.status(201).json(await content[req.params.resource].create(data)); }
  catch (e) { if (e.code === '23503') return res.status(400).json({ errors: { programId: 'Хөтөлбөр олдсонгүй.' } }); throw e; }
}));

app.put(`${R}/order`, requireAdmin, resourceParam, ah(async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter((x) => UUID_RE.test(x)) : [];
  await content[req.params.resource].reorder(ids);
  res.status(204).end();
}));

app.put(`${R}/:id`, requireAdmin, resourceParam, ah(async (req, res) => {
  const { data, errors } = sanitize(req.params.resource, req.body, { partial: true });
  if (Object.keys(errors).length) return res.status(400).json({ errors });
  let item;
  try { item = await content[req.params.resource].update(req.params.id, data); }
  catch (e) { if (e.code === '23503') return res.status(400).json({ errors: { programId: 'Хөтөлбөр олдсонгүй.' } }); throw e; }
  if (!item) return res.status(404).json({ error: 'Олдсонгүй.' });
  res.json(item);
}));

app.delete(`${R}/:id`, requireAdmin, resourceParam, ah(async (req, res) => {
  const ok = await content[req.params.resource].remove(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Олдсонгүй.' });
  res.status(204).end();
}));

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// Алдаа барих (өгөгдлийн сангийн алдааг хэрэглэгчид дэлгэрэнгүй харуулахгүй)
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Серверт алдаа гарлаа. Түр хүлээгээд дахин оролдоно уу.' });
});

// ---------- Production: React build-ийг үйлчлэх ----------
const dist = path.join(__dirname, '..', 'client', 'dist');
if (existsSync(dist)) {
  app.use(express.static(dist, { maxAge: '7d', index: false }));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

try {
  await initDb();
  await seedContent();
  cleanupOrphanVideos().catch((e) => console.error('Видео цэвэрлэх алдаа:', e.message));
  setInterval(() => cleanupOrphanVideos().catch(() => {}), 6 * 3600_000).unref();
  pruneViews().catch(() => {});
  setInterval(() => pruneViews().catch(() => {}), 24 * 3600_000).unref();
} catch (err) {
  // Хамгийн их тохиолддог алдаануудад ойлгомжтой тайлбар
  const hints = {
    '28P01': 'PostgreSQL-ийн хэрэглэгчийн нэр эсвэл нууц үг буруу. server/.env доторх DATABASE_URL-ийг шалгана уу.',
    '3D000': 'Өгөгдлийн сан үүсээгүй байна. createdb ашиглан үүсгэнэ үү.',
    ECONNREFUSED: 'PostgreSQL асаагүй байна (эсвэл порт буруу).',
    ENOTFOUND: 'DATABASE_URL доторх хост буруу. Нууц үгэнд @ # / зэрэг тэмдэгт байвал кодлох шаардлагатай (@ → %40).',
  };
  console.error('\n❌ Өгөгдлийн сантай холбогдож чадсангүй:', err.message);
  const hint = hints[err.code] || hints[err.errors?.[0]?.code];
  if (hint) console.error('👉 ' + hint + '\n');
  process.exit(1);
}
const server = app.listen(PORT, () => console.log(`MindEdu API → http://localhost:${PORT}`));
// Том видео хуулахад Node-ийн анхдагч 5 минутын хязгаар хүрэлцэхгүй
server.requestTimeout = 3 * 3600_000;

// Сервер унтрахад холболтуудыг цэвэрхэн хаана
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, async () => { await pool.end().catch(() => {}); process.exit(0); });
}
