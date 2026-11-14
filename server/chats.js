// Чат-ботоор үлдээсэн холбоо барих мэдээлэл
import { pool } from './db.js';

export const CHAT_STATUSES = ['new', 'contacted', 'done'];
export const CHAT_TOPICS = ['question', 'enroll', 'price', 'other'];

const COLS = `id, name, phone, age, topic, message, transcript, status, note,
  created_at AS "createdAt", updated_at AS "updatedAt"`;

export function sanitizeChat(body = {}) {
  const errors = {};
  const name = String(body.name ?? '').trim().slice(0, 60);
  const phone = String(body.phone ?? '').replace(/\D/g, '');
  const ageNum = body.age === undefined || body.age === null || body.age === '' ? null : Number(body.age);
  const topic = CHAT_TOPICS.includes(body.topic) ? body.topic : 'other';
  const message = String(body.message ?? '').trim().slice(0, 1000);
  const transcript = (Array.isArray(body.transcript) ? body.transcript : []).slice(-60)
    .filter((m) => m && (m.from === 'bot' || m.from === 'user'))
    .map((m) => ({ from: m.from, text: String(m.text ?? '').slice(0, 1000) }));
  if (!name) errors.name = 'Нэрээ оруулна уу.';
  if (phone.length !== 8) errors.phone = '8 оронтой утасны дугаар оруулна уу.';
  if (ageNum !== null && (!Number.isInteger(ageNum) || ageNum < 1 || ageNum > 99)) errors.age = 'Насаа тоогоор оруулна уу.';
  return { data: { name, phone, age: ageNum, topic, message, transcript }, errors };
}

export const chats = {
  async create(d) {
    const { rows } = await pool.query(
      `INSERT INTO chat_leads (name, phone, age, topic, message, transcript) VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${COLS}`,
      [d.name, d.phone, d.age, d.topic, d.message, JSON.stringify(d.transcript)]);
    return rows[0];
  },
  async list() {
    const { rows } = await pool.query(`SELECT ${COLS} FROM chat_leads ORDER BY created_at DESC`);
    return rows;
  },
  async update(id, { status, note }) {
    const { rows } = await pool.query(
      `UPDATE chat_leads SET status = COALESCE($2, status), note = COALESCE($3, note), updated_at = now()
       WHERE id = $1 RETURNING ${COLS}`, [id, status ?? null, note ?? null]);
    return rows[0] ?? null;
  },
  async remove(id) {
    const { rowCount } = await pool.query('DELETE FROM chat_leads WHERE id = $1', [id]);
    return rowCount > 0;
  },
  async countNew() {
    const { rows } = await pool.query(`SELECT count(*)::int AS n FROM chat_leads WHERE status = 'new'`);
    return rows[0].n;
  },
};
