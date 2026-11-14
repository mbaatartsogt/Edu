// Хэрэглэгчийн бүртгэл (эцэг эх) ба захиалга
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { pool } from './db.js';

const scrypt = promisify(crypto.scrypt);

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  const [saltHex, hashHex] = String(stored).split(':');
  if (!saltHex || !hashHex) return false;
  const hash = await scrypt(password, Buffer.from(saltHex, 'hex'), 64);
  const expected = Buffer.from(hashHex, 'hex');
  return expected.length === hash.length && crypto.timingSafeEqual(expected, hash);
}

const USER_COLS = `id, name, phone, email, (email_verified_at IS NOT NULL) AS "emailVerified", (phone_verified_at IS NOT NULL) AS "phoneVerified",
  (email_verified_at IS NOT NULL OR phone_verified_at IS NOT NULL) AS verified, created_at AS "createdAt"`;
const ORDER_COLS = `o.id, o.order_no AS "orderNo", o.user_id AS "userId", o.program_id AS "programId", o.program_title AS "programTitle",
  o.program_age AS "programAge", o.branch_id AS "branchId", o.branch_name AS "branchName", o.child_name AS "childName",
  o.child_age AS "childAge", o.amount, o.status, o.payment_method AS "paymentMethod", o.qpay_invoice_id AS "invoiceId",
  o.qpay_data AS "payment", o.paid_at AS "paidAt", o.note, o.created_at AS "createdAt", o.updated_at AS "updatedAt",
  (SELECT COALESCE(json_agg(json_build_object(
      'id', i.id, 'programId', i.program_id, 'programTitle', i.program_title, 'programAge', i.program_age,
      'branchId', i.branch_id, 'branchName', i.branch_name, 'childName', i.child_name, 'childAge', i.child_age, 'amount', i.amount
    ) ORDER BY i.position), '[]'::json) FROM order_items i WHERE i.order_id = o.id) AS items`;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** method: 'phone' — утас заавал (OTP), 'email' — и-мэйл заавал (линк), утас заавал биш */
export function sanitizeRegister(b = {}) {
  const errors = {};
  const method = b.method === 'phone' ? 'phone' : 'email';
  const name = String(b.name ?? '').trim().slice(0, 60);
  const phone = String(b.phone ?? '').replace(/\D/g, '');
  const email = method === 'email' ? String(b.email ?? '').trim().toLowerCase().slice(0, 120) : '';
  const password = String(b.password ?? '');
  if (name.length < 2) errors.name = 'Нэрээ оруулна уу.';
  if (method === 'phone' ? phone.length !== 8 : phone && phone.length !== 8) errors.phone = '8 оронтой утасны дугаар оруулна уу.';
  if (method === 'email' && !EMAIL_RE.test(email)) errors.email = 'И-мэйл хаягаа зөв оруулна уу.';
  if (password.length < 6) errors.password = 'Нууц үг хамгийн багадаа 6 тэмдэгт байна.';
  if (password.length > 200) errors.password = 'Нууц үг хэт урт байна.';
  return { data: { method, name, phone: phone || null, email, password }, errors };
}

export const users = {
  async create({ name, phone, email, password }) {
    const passwordHash = await hashPassword(password);
    try {
      const { rows } = await pool.query(
        `INSERT INTO users (name, phone, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING ${USER_COLS}`,
        [name, phone, email, passwordHash]);
      return rows[0];
    } catch (e) {
      if (e.code === '23505') return { conflict: e.constraint === 'users_email_uq' ? 'email' : 'phone' };
      throw e;
    }
  },
  /** И-мэйл эсвэл утасны дугаараар хайна */
  async findForLogin(identifier) {
    const id = String(identifier ?? '').trim();
    const byEmail = id.includes('@');
    const value = byEmail ? id.toLowerCase() : id.replace(/\D/g, '');
    if (!value || (!byEmail && value.length !== 8)) return null;
    const { rows } = await pool.query(
      `SELECT ${USER_COLS}, password_hash FROM users WHERE ${byEmail ? 'lower(email) = $1' : 'phone = $1'}`, [value]);
    return rows[0] ?? null;
  },
  async findByPhone(phone) {
    const p = String(phone ?? '').replace(/\D/g, '');
    if (p.length !== 8) return null;
    const { rows } = await pool.query(`SELECT ${USER_COLS} FROM users WHERE phone = $1`, [p]);
    return rows[0] ?? null;
  },
  async findByEmail(email) {
    const { rows } = await pool.query(`SELECT ${USER_COLS} FROM users WHERE lower(email) = lower($1) AND email <> ''`, [String(email ?? '').trim()]);
    return rows[0] ?? null;
  },
  /** И-мэйл баталгаажуулна. Бүртгэл анх идэвхжсэн бол true (урамшууллын оноо нэг л удаа) */
  async markVerified(id) {
    const { rows } = await pool.query(
      'UPDATE users SET email_verified_at = now() WHERE id = $1 AND email_verified_at IS NULL RETURNING (phone_verified_at IS NULL) AS first', [id]);
    return rows[0]?.first ?? false;
  },
  async markPhoneVerified(id) {
    const { rows } = await pool.query(
      'UPDATE users SET phone_verified_at = now() WHERE id = $1 AND phone_verified_at IS NULL RETURNING (email_verified_at IS NULL) AS first', [id]);
    return rows[0]?.first ?? false;
  },
  async setPassword(id, password) {
    await pool.query('UPDATE users SET password_hash = $2 WHERE id = $1', [id, await hashPassword(password)]);
  },
  async listWithPoints() {
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.phone, u.email, (u.email_verified_at IS NOT NULL) AS "emailVerified", (u.phone_verified_at IS NOT NULL) AS "phoneVerified",
         (u.email_verified_at IS NOT NULL OR u.phone_verified_at IS NOT NULL) AS verified, u.created_at AS "createdAt",
         COALESCE((SELECT sum(amount) FROM point_transactions t WHERE t.user_id = u.id), 0)::int AS points,
         (SELECT count(*) FROM orders o WHERE o.user_id = u.id AND o.status = 'paid')::int AS "paidOrders"
       FROM users u ORDER BY u.created_at DESC`);
    return rows;
  },
  async get(id) {
    const { rows } = await pool.query(`SELECT ${USER_COLS} FROM users WHERE id = $1`, [id]);
    return rows[0] ?? null;
  },
};

export const orders = {
  /** Сагсны бүх хөтөлбөрийг нэг захиалга болгоно. items: [{ programId, programTitle, programAge, branchId, branchName, childName, childAge, amount }] */
  async createWithItems(userId, items) {
    const total = items.reduce((s, i) => s + i.amount, 0);
    const titles = [...new Set(items.map((i) => i.programTitle))];
    const children = [...new Set(items.map((i) => i.childName))];
    const branches = [...new Set(items.map((i) => i.branchName).filter(Boolean))];
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: [o] } = await client.query(
        `INSERT INTO orders (user_id, program_id, program_title, program_age, branch_id, branch_name, child_name, child_age, amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [userId, items.length === 1 ? items[0].programId : null,
          (items.length === 1 ? titles[0] : `${items.length} хөтөлбөр: ${titles.join(', ')}`).slice(0, 300),
          items.length === 1 ? items[0].programAge : '', items.length === 1 ? items[0].branchId : null,
          branches.join(', ').slice(0, 200), children.join(', ').slice(0, 200), items[0].childAge, total]);
      for (const [idx, i] of items.entries()) {
        await client.query(
          `INSERT INTO order_items (order_id, position, program_id, program_title, program_age, branch_id, branch_name, child_name, child_age, amount)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [o.id, idx, i.programId, i.programTitle, i.programAge, i.branchId, i.branchName, i.childName, i.childAge, i.amount]);
      }
      await client.query('COMMIT');
      return this.get(o.id);
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally { client.release(); }
  },
  async create(d) {
    const { rows } = await pool.query(
      `INSERT INTO orders AS o (user_id, program_id, program_title, program_age, branch_id, branch_name, child_name, child_age, amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING ${ORDER_COLS}`,
      [d.userId, d.programId, d.programTitle, d.programAge, d.branchId, d.branchName, d.childName, d.childAge, d.amount]);
    return rows[0];
  },
  async attachInvoice(id, invoiceId, payment) {
    const { rows } = await pool.query(
      `UPDATE orders AS o SET qpay_invoice_id = $2, qpay_data = $3, updated_at = now() WHERE id = $1 RETURNING ${ORDER_COLS}`,
      [id, invoiceId, JSON.stringify(payment)]);
    return rows[0];
  },
  async get(id) {
    const { rows } = await pool.query(`SELECT ${ORDER_COLS} FROM orders o WHERE o.id = $1`, [id]);
    return rows[0] ?? null;
  },
  async listByUser(userId) {
    const { rows } = await pool.query(`SELECT ${ORDER_COLS} FROM orders o WHERE o.user_id = $1 ORDER BY o.created_at DESC`, [userId]);
    return rows;
  },
  /** Зөвхөн pending төлөвөөс шилжүүлнэ — давхар callback ирсэн ч нэг л удаа paid болно */
  async markPaid(id) {
    const { rows } = await pool.query(
      `UPDATE orders AS o SET status = 'paid', paid_at = now(), updated_at = now() WHERE id = $1 AND status = 'pending' RETURNING ${ORDER_COLS}`, [id]);
    return rows[0] ?? null;
  },
  async setStatus(id, status, note) {
    const { rows } = await pool.query(
      `UPDATE orders AS o SET status = COALESCE($2, status), note = COALESCE($3, note),
         paid_at = CASE WHEN $2 = 'paid' AND paid_at IS NULL THEN now() WHEN $2 IS NOT NULL AND $2 <> 'paid' THEN NULL ELSE paid_at END,
         updated_at = now()
       WHERE id = $1 RETURNING ${ORDER_COLS}`, [id, status ?? null, note ?? null]);
    return rows[0] ?? null;
  },
  async listAll() {
    const { rows } = await pool.query(
      `SELECT ${ORDER_COLS}, u.name AS "parentName", u.phone AS "parentPhone"
       FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.created_at DESC`);
    return rows;
  },
  async stats() {
    const { rows: [r] } = await pool.query(`
      SELECT
        COALESCE(sum(amount) FILTER (WHERE status = 'paid'), 0)::bigint AS "paidTotal",
        COALESCE(sum(amount) FILTER (WHERE status = 'paid' AND paid_at >= date_trunc('month', now())), 0)::bigint AS "paidThisMonth",
        count(*) FILTER (WHERE status = 'paid')::int AS "paidCount",
        count(*) FILTER (WHERE status = 'pending')::int AS "pendingCount",
        (SELECT count(*)::int FROM users) AS "userCount"
      FROM orders`);
    return { ...r, paidTotal: Number(r.paidTotal), paidThisMonth: Number(r.paidThisMonth) };
  },
};

// ---------- Нэг удаагийн токен (и-мэйл баталгаажуулах, нууц үг сэргээх) ----------
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

export const tokens = {
  async create(userId, kind, ttlMs) {
    const raw = crypto.randomBytes(32).toString('base64url');
    // Өмнөх ашиглагдаагүй токенуудыг хүчингүй болгоно
    await pool.query(`UPDATE user_tokens SET used_at = now() WHERE user_id = $1 AND kind = $2 AND used_at IS NULL`, [userId, kind]);
    await pool.query(`INSERT INTO user_tokens (user_id, kind, token_hash, expires_at) VALUES ($1, $2, $3, now() + $4 * interval '1 millisecond')`,
      [userId, kind, sha256(raw), ttlMs]);
    return raw;
  },
  /** Токеныг нэг л удаа ашиглана. Хүчинтэй бол user_id буцаана */
  async consume(raw, kind) {
    if (!raw || typeof raw !== 'string' || raw.length > 200) return null;
    const { rows } = await pool.query(
      `UPDATE user_tokens SET used_at = now() WHERE token_hash = $1 AND kind = $2 AND used_at IS NULL AND expires_at > now() RETURNING user_id`,
      [sha256(raw), kind]);
    return rows[0]?.user_id ?? null;
  },
  /** Сүүлийн илгээлтээс хойш хэдэн секунд өнгөрснийг буцаана (давтан илгээхийг хязгаарлах) */
  async secondsSinceLast(userId, kind) {
    const { rows } = await pool.query(
      `SELECT EXTRACT(EPOCH FROM now() - max(created_at))::int AS s FROM user_tokens WHERE user_id = $1 AND kind = $2`, [userId, kind]);
    return rows[0]?.s ?? null;
  },
};

// ---------- SMS OTP код ----------
const OTP_TTL_MIN = 5;
const OTP_MAX_ATTEMPTS = 5;
const hmac = (code, phone) => crypto.createHash('sha256').update(`${phone}:${code}`).digest('hex');

export const otps = {
  /** Шинэ 6 оронтой код үүсгэнэ (өмнөхийг хүчингүй болгоно) */
  async create(userId, phone, purpose) {
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    await pool.query(`UPDATE otp_codes SET used_at = now() WHERE phone = $1 AND purpose = $2 AND used_at IS NULL`, [phone, purpose]);
    await pool.query(
      `INSERT INTO otp_codes (user_id, phone, purpose, code_hash, expires_at) VALUES ($1, $2, $3, $4, now() + interval '${OTP_TTL_MIN} minutes')`,
      [userId, phone, purpose, hmac(code, phone)]);
    return code;
  },
  /** Сүүлийн илгээлтээс хойших секунд, сүүлийн 1 цагт илгээсэн тоо */
  async sendStats(phone, purpose) {
    const { rows: [r] } = await pool.query(
      `SELECT EXTRACT(EPOCH FROM now() - max(created_at))::int AS since,
              count(*) FILTER (WHERE created_at > now() - interval '1 hour')::int AS hour
       FROM otp_codes WHERE phone = $1 AND purpose = $2`, [phone, purpose]);
    return { since: r.since, hour: r.hour };
  },
  /** Код шалгана. { userId } эсвэл { error } буцаана */
  async verify(phone, purpose, code) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: [otp] } = await client.query(
        `SELECT id, user_id, code_hash, attempts, expires_at < now() AS expired FROM otp_codes
         WHERE phone = $1 AND purpose = $2 AND used_at IS NULL ORDER BY created_at DESC LIMIT 1 FOR UPDATE`, [phone, purpose]);
      let result;
      if (!otp) result = { error: 'Код олдсонгүй. Шинэ код авна уу.' };
      else if (otp.expired) result = { error: 'Кодын хугацаа дууссан. Шинэ код авна уу.' };
      else if (otp.attempts >= OTP_MAX_ATTEMPTS) result = { error: 'Хэт олон удаа буруу оруулсан. Шинэ код авна уу.' };
      else {
        const ok = crypto.timingSafeEqual(Buffer.from(otp.code_hash), Buffer.from(hmac(String(code ?? '').replace(/\D/g, ''), phone)));
        if (ok) {
          await client.query('UPDATE otp_codes SET used_at = now() WHERE id = $1', [otp.id]);
          result = { userId: otp.user_id };
        } else {
          await client.query('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1', [otp.id]);
          const left = OTP_MAX_ATTEMPTS - otp.attempts - 1;
          result = { error: left > 0 ? `Код буруу байна. ${left} оролдлого үлдлээ.` : 'Хэт олон удаа буруу оруулсан. Шинэ код авна уу.' };
        }
      }
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally { client.release(); }
  },
};
