// MindPoint — онооны систем: цуглуулах, бэлгээр солих
import crypto from 'node:crypto';
import { pool } from './db.js';
import { settings } from './content.js';

export class PointsError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

async function rates() {
  const s = await settings.get();
  return {
    per1000: Math.max(0, Number(s.pointsPer1000) || 0),
    signup: Math.max(0, Number(s.pointsSignup) || 0),
  };
}

const TX_COLS = `id, amount, kind, reason, ref_id AS "refId", created_at AS "createdAt"`;
const RD_COLS = `r.id, r.code, r.user_id AS "userId", r.reward_id AS "rewardId", r.reward_title AS "rewardTitle", r.reward_image AS "rewardImage",
  r.points, r.status, r.note, r.created_at AS "createdAt", r.updated_at AS "updatedAt"`;

export async function balance(userId, db = pool) {
  const { rows } = await db.query('SELECT COALESCE(sum(amount), 0)::int AS b FROM point_transactions WHERE user_id = $1', [userId]);
  return rows[0].b;
}

async function addTx(db, userId, amount, kind, reason, refId = null) {
  if (!amount) return;
  await db.query('INSERT INTO point_transactions (user_id, amount, kind, reason, ref_id) VALUES ($1, $2, $3, $4, $5)',
    [userId, amount, kind, reason, refId]);
}

export const points = {
  balance,

  async history(userId) {
    const { rows } = await pool.query(`SELECT ${TX_COLS} FROM point_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`, [userId]);
    return rows;
  },

  /** Төлбөр төлөгдөхөд оноо нэмнэ (захиалга pending→paid болох үед нэг л удаа дуудагдана) */
  async earnForOrder(order) {
    const { per1000 } = await rates();
    const amount = Math.floor((order.amount / 1000) * per1000);
    await addTx(pool, order.userId, amount, 'earn_order', `${order.programTitle} — ${order.orderNo}`, order.id);
    return amount;
  },

  /** Админ төлөгдсөн захиалгыг буцаавал өгсөн оноог хасна */
  async reverseForOrder(order) {
    const { rows } = await pool.query(
      `SELECT COALESCE(sum(amount), 0)::int AS s FROM point_transactions WHERE ref_id = $1 AND kind IN ('earn_order', 'earn_reversal')`, [order.id]);
    if (rows[0].s > 0) await addTx(pool, order.userId, -rows[0].s, 'earn_reversal', `Захиалга буцаасан — ${order.orderNo}`, order.id);
  },

  async signupBonus(userId) {
    const { signup } = await rates();
    await addTx(pool, userId, signup, 'signup', 'Бүртгэлийн урамшуулал');
    return signup;
  },

  async adminAdjust(userId, amount, reason) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId]);
      const b = await balance(userId, client);
      if (b + amount < 0) throw new PointsError(400, `Үлдэгдэл хүрэлцэхгүй (одоо ${b} оноо).`);
      await addTx(client, userId, amount, 'admin', reason);
      await client.query('COMMIT');
      return b + amount;
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally { client.release(); }
  },

  /** Бэлэг авах: оноо хүрэлцэх, үлдэгдэл байгаа эсэхийг нэг транзакцид шалгана */
  async redeem(userId, rewardId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId]); // нэг хэрэглэгчийн зэрэг хүсэлтийг дараалуулна
      const { rows: [reward] } = await client.query(
        'SELECT id, title, image, points_cost, stock FROM rewards WHERE id = $1 AND visible FOR UPDATE', [rewardId]);
      if (!reward) throw new PointsError(404, 'Бэлэг олдсонгүй.');
      if (reward.points_cost <= 0) throw new PointsError(400, 'Энэ бэлгийн оноо тохируулагдаагүй байна.');
      if (reward.stock !== null && reward.stock <= 0) throw new PointsError(409, 'Уучлаарай, энэ бэлэг дууссан байна.');
      const b = await balance(userId, client);
      if (b < reward.points_cost) throw new PointsError(400, `Оноо хүрэлцэхгүй байна. Танд ${b} оноо байна, ${reward.points_cost - b} оноо дутуу.`);
      if (reward.stock !== null) await client.query('UPDATE rewards SET stock = stock - 1, updated_at = now() WHERE id = $1', [reward.id]);
      const code = 'MP-' + crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
      const { rows: [rd] } = await client.query(
        `INSERT INTO redemptions AS r (code, user_id, reward_id, reward_title, reward_image, points)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${RD_COLS}`,
        [code, userId, reward.id, reward.title, reward.image, reward.points_cost]);
      await addTx(client, userId, -reward.points_cost, 'redeem', reward.title, rd.id);
      await client.query('COMMIT');
      return { redemption: rd, balance: b - reward.points_cost };
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally { client.release(); }
  },

  async redemptionsByUser(userId) {
    const { rows } = await pool.query(`SELECT ${RD_COLS} FROM redemptions r WHERE r.user_id = $1 ORDER BY r.created_at DESC`, [userId]);
    return rows;
  },

  async allRedemptions() {
    const { rows } = await pool.query(
      `SELECT ${RD_COLS}, u.name AS "userName", u.phone AS "userPhone", u.email AS "userEmail"
       FROM redemptions r JOIN users u ON u.id = r.user_id ORDER BY r.created_at DESC`);
    return rows;
  },

  /** Админ: олгосон / цуцалсан. Цуцлахад оноог буцааж, үлдэгдлийг сэргээнэ */
  async setRedemptionStatus(id, status, note) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: [cur] } = await client.query(`SELECT ${RD_COLS} FROM redemptions r WHERE r.id = $1 FOR UPDATE`, [id]);
      if (!cur) throw new PointsError(404, 'Олдсонгүй.');
      if (status && status !== cur.status) {
        if (cur.status === 'cancelled') throw new PointsError(400, 'Цуцлагдсан олголтыг сэргээх боломжгүй.');
        if (status === 'cancelled') {
          await addTx(client, cur.userId, cur.points, 'refund', `Буцаалт — ${cur.rewardTitle}`, cur.id);
          if (cur.rewardId) await client.query('UPDATE rewards SET stock = stock + 1 WHERE id = $1 AND stock IS NOT NULL', [cur.rewardId]);
        }
      }
      const { rows: [row] } = await client.query(
        `UPDATE redemptions AS r SET status = COALESCE($2, status), note = COALESCE($3, note), updated_at = now() WHERE id = $1 RETURNING ${RD_COLS}`,
        [id, status ?? null, note ?? null]);
      await client.query('COMMIT');
      return row;
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally { client.release(); }
  },

  async pendingRedemptions() {
    const { rows } = await pool.query(`SELECT count(*)::int AS n FROM redemptions WHERE status = 'pending'`);
    return rows[0].n;
  },
};
