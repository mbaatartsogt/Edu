// Видео хичээл үзэх эрх: хөтөлбөрийн төлбөр төлсөн, хугацаа нь дуусаагүй эцэг эхчүүд
import { pool } from './db.js';
import { content } from './content.js';
import { playerFor } from './videos.js';

const DAY = 86_400_000;
// Төлбөрийн хугацаа дууссанаас хойш хичээл үзэх боломжтой хэвээр байх хоног
export const LESSON_GRACE_DAYS = Math.max(0, Number(process.env.LESSON_GRACE_DAYS ?? 3) || 0);

/**
 * Хөтөлбөр бүрийн эрх: { active, until, oneTime, children }
 * Урьдчилж хэд хэдэн удаа төлсөн бол хугацаа нь нэмэгдэнэ.
 */
export async function accessFor(userId, programs) {
  const { rows } = await pool.query(
    `SELECT i.program_id AS "programId", o.id AS "orderId", o.paid_at AS "paidAt", array_agg(DISTINCT i.child_name) AS children
     FROM order_items i JOIN orders o ON o.id = i.order_id
     WHERE o.user_id = $1 AND o.status = 'paid' AND o.paid_at IS NOT NULL AND i.program_id IS NOT NULL
     GROUP BY i.program_id, o.id, o.paid_at
     ORDER BY o.paid_at`, [userId]);

  const byId = new Map(programs.map((p) => [p.id, p]));
  const now = Date.now();
  const out = new Map();
  for (const r of rows) {
    const p = byId.get(r.programId);
    if (!p) continue;
    const a = out.get(r.programId) ?? { untilMs: 0, oneTime: false, children: new Set() };
    r.children.forEach((c) => a.children.add(c));
    if (!p.billingDays) a.oneTime = true;
    else a.untilMs = Math.max(a.untilMs, new Date(r.paidAt).getTime()) + p.billingDays * DAY;
    out.set(r.programId, a);
  }
  return new Map([...out].map(([id, a]) => [id, {
    active: a.oneTime || now < a.untilMs + LESSON_GRACE_DAYS * DAY,
    oneTime: a.oneTime,
    until: a.oneTime ? null : new Date(a.untilMs).toISOString(),
    children: [...a.children],
  }]));
}

/** Хичээл үзэх эрхтэй эсэх. Хөтөлбөргүй (ерөнхий) хичээлийг аль нэг идэвхтэй хөтөлбөртэй хүн үзнэ */
export function canWatch(lesson, access) {
  if (lesson.isFree) return true;
  if (lesson.programId) return Boolean(access.get(lesson.programId)?.active);
  return [...access.values()].some((a) => a.active);
}

async function progressMap(userId) {
  const { rows } = await pool.query(
    `SELECT lesson_id AS "lessonId", position_sec AS "positionSec", completed_at AS "completedAt", updated_at AS "updatedAt"
     FROM lesson_progress WHERE user_id = $1`, [userId]);
  return new Map(rows.map((r) => [r.lessonId, r]));
}

const publicLesson = (l, watch, prog) => ({
  id: l.id, programId: l.programId, module: l.module, title: l.title, description: l.description,
  duration: l.duration, isFree: l.isFree, canWatch: watch,
  // YouTube-ийн автомат зураг видеоны ID-г задруулдаг тул зөвхөн эрхтэй үед өгнө
  thumbnail: l.thumbnail || (watch ? playerFor(l.video).thumbnail || '' : ''),
  completed: Boolean(prog?.completedAt), positionSec: prog?.positionSec ?? 0, watchedAt: prog?.updatedAt ?? null,
});

/** Эцэг эхийн "Видео хичээл" хуудасны өгөгдөл */
export async function lessonsForUser(userId) {
  const [programs, lessons, progress] = await Promise.all([
    content.programs.list(), content.lessons.list({ onlyVisible: true }), progressMap(userId),
  ]);
  const access = await accessFor(userId, programs);

  const groups = [];
  const general = lessons.filter((l) => !l.programId || !programs.some((p) => p.id === l.programId));
  for (const p of programs) {
    const own = lessons.filter((l) => l.programId === p.id);
    const a = access.get(p.id) ?? null;
    // Төлөөгүй, сайтаас нуусан хөтөлбөрийг харуулахгүй. Хичээлгүй бол зөвхөн төлсөн үед харуулна
    if (!a && (!p.visible || !own.length)) continue;
    groups.push({
      program: { id: p.id, title: p.title, age: p.age, level: p.level, theme: p.theme, price: p.price, priceLabel: p.priceLabel, visible: p.visible },
      access: a,
      lessons: own.map((l) => publicLesson(l, canWatch(l, access), progress.get(l.id))),
    });
  }
  // Төлсөн хөтөлбөрүүд эхэнд
  groups.sort((x, y) => Number(Boolean(y.access?.active)) - Number(Boolean(x.access?.active)) || Number(Boolean(y.access)) - Number(Boolean(x.access)));
  if (general.length) {
    groups.push({ program: null, access: null, lessons: general.map((l) => publicLesson(l, canWatch(l, access), progress.get(l.id))) });
  }
  return { groups, graceDays: LESSON_GRACE_DAYS };
}

/** Нэг хичээл (тоглуулагчтай) — эрхгүй бол locked */
export async function lessonForUser(userId, lessonId) {
  const { rows: [lesson] } = await pool.query(
    `SELECT id, program_id AS "programId", module, title, description, video, duration, thumbnail, is_free AS "isFree", visible
     FROM lessons WHERE id = $1`, [lessonId]);
  if (!lesson || !lesson.visible) return null;
  const programs = await content.programs.list();
  const access = await accessFor(userId, programs);
  const watch = canWatch(lesson, access);
  const progress = (await progressMap(userId)).get(lesson.id);
  const program = programs.find((p) => p.id === lesson.programId) ?? null;
  return {
    lesson: publicLesson(lesson, watch, progress),
    program: program && { id: program.id, title: program.title, age: program.age, theme: program.theme, price: program.price, priceLabel: program.priceLabel },
    access: program ? access.get(program.id) ?? null : null,
    player: watch ? playerFor(lesson.video) : null,
  };
}

export async function saveProgress(userId, lessonId, { positionSec, completed }) {
  const pos = Math.max(0, Math.min(86_400, Math.round(Number(positionSec) || 0)));
  const { rows: [r] } = await pool.query(
    `INSERT INTO lesson_progress (user_id, lesson_id, position_sec, completed_at)
     VALUES ($1, $2, $3, CASE WHEN $4::boolean THEN now() END)
     ON CONFLICT (user_id, lesson_id) DO UPDATE SET
       position_sec = EXCLUDED.position_sec,
       completed_at = CASE WHEN $4::boolean IS NULL THEN lesson_progress.completed_at
                           WHEN $4::boolean THEN COALESCE(lesson_progress.completed_at, now()) ELSE NULL END,
       updated_at = now()
     RETURNING position_sec AS "positionSec", completed_at AS "completedAt"`,
    [userId, lessonId, pos, typeof completed === 'boolean' ? completed : null]);
  return { positionSec: r.positionSec, completed: Boolean(r.completedAt) };
}

/** Админд: хичээл бүрийг хэдэн хүн үзэж эхэлсэн, дуусгасан */
export async function lessonStats() {
  const { rows } = await pool.query(
    `SELECT lesson_id AS "lessonId", count(*)::int AS viewers, count(completed_at)::int AS completed
     FROM lesson_progress GROUP BY lesson_id`);
  return Object.fromEntries(rows.map((r) => [r.lessonId, { viewers: r.viewers, completed: r.completed }]));
}
