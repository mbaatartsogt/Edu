// PostgreSQL өгөгдлийн сан (node-postgres)
import pg from 'pg';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL тохируулаагүй байна. server/.env файлыг шалгана уу.');
  process.exit(1);
}

// Render, Neon, Supabase зэрэг cloud сервис SSL шаарддаг → PGSSL=true
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
  max: Number(process.env.PG_POOL_MAX) || 10,
});

pool.on('error', (err) => console.error('PostgreSQL pool алдаа:', err.message));

export async function initDb() {
  const sql = await readFile(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('✓ PostgreSQL холбогдлоо');
}

export const STATUSES = ['new', 'contacted', 'tested', 'enrolled', 'cancelled'];

const COLS = `id, child_name AS "childName", age, phone, schedule, status, note,
  created_at AS "createdAt", updated_at AS "updatedAt"`;

export const enrollments = {
  async list() {
    const { rows } = await pool.query(`SELECT ${COLS} FROM enrollments ORDER BY created_at DESC`);
    return rows;
  },

  async create({ childName, age, phone, schedule }) {
    const { rows } = await pool.query(
      `INSERT INTO enrollments (child_name, age, phone, schedule) VALUES ($1, $2, $3, $4) RETURNING ${COLS}`,
      [childName, age, phone, schedule],
    );
    return rows[0];
  },

  async update(id, { status, note }) {
    const { rows } = await pool.query(
      `UPDATE enrollments
         SET status = COALESCE($2, status), note = COALESCE($3, note), updated_at = now()
       WHERE id = $1 RETURNING ${COLS}`,
      [id, status ?? null, note ?? null],
    );
    return rows[0] ?? null;
  },

  async remove(id) {
    const { rowCount } = await pool.query('DELETE FROM enrollments WHERE id = $1', [id]);
    return rowCount > 0;
  },

  async stats() {
    const { rows: [r] } = await pool.query(`
      SELECT
        count(*)::int                                                     AS total,
        count(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS "thisWeek",
        count(*) FILTER (WHERE status = 'new')::int        AS s_new,
        count(*) FILTER (WHERE status = 'contacted')::int  AS s_contacted,
        count(*) FILTER (WHERE status = 'tested')::int     AS s_tested,
        count(*) FILTER (WHERE status = 'enrolled')::int   AS s_enrolled,
        count(*) FILTER (WHERE status = 'cancelled')::int  AS s_cancelled,
        count(*) FILTER (WHERE age <= 11)::int             AS g1,
        count(*) FILTER (WHERE age BETWEEN 12 AND 14)::int AS g2,
        count(*) FILTER (WHERE age >= 15)::int             AS g3
      FROM enrollments`);
    const { rows: sched } = await pool.query('SELECT schedule, count(*)::int AS n FROM enrollments GROUP BY schedule');
    return {
      total: r.total,
      thisWeek: r.thisWeek,
      byStatus: Object.fromEntries(STATUSES.map((s) => [s, r[`s_${s}`]])),
      byGroup: { '8-11': r.g1, '12-14': r.g2, '15-18': r.g3 },
      bySchedule: Object.fromEntries(sched.map((x) => [x.schedule, x.n])),
    };
  },
};
