// Сайтын хандалт бүртгэх, өдрөөр нь нэгтгэх
import { pool } from './db.js';

// Өдрийг аль цагийн бүсээр тоолох (Улаанбаатар)
export const STATS_TZ = process.env.STATS_TZ || 'Asia/Ulaanbaatar';
const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|pingdom|uptime|curl|wget|python|axios|node-fetch/i;

export function deviceOf(ua = '') {
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return 'tablet';
  if (/mobi|iphone|android/i.test(ua)) return 'mobile';
  return 'desktop';
}

export function refHost(ref, ownHost) {
  try {
    const h = new URL(ref).hostname.replace(/^www\./, '');
    if (!h || h === ownHost?.replace(/^www\./, '').split(':')[0]) return '';
    if (/(^|\.)facebook\.com$|fb\.me$|m\.facebook/.test(h)) return 'facebook.com';
    if (/(^|\.)instagram\.com$/.test(h)) return 'instagram.com';
    if (/(^|\.)google\./.test(h)) return 'google';
    return h.slice(0, 80);
  } catch { return ''; }
}

export async function track({ visitorId, userId, path, referrer, ua, host }) {
  if (BOT_RE.test(ua || '')) return false;
  const vid = String(visitorId || '').replace(/[^\w-]/g, '').slice(0, 40);
  const p = String(path || '/').split(/[?#]/)[0].slice(0, 200);
  if (vid.length < 8 || !p.startsWith('/') || p.startsWith('/admin') || p.startsWith('/api')) return false;
  // Хувийн токен агуулсан хуудсуудыг нэгтгэнэ
  const clean = p.replace(/\/[0-9a-f]{8}-[0-9a-f-]{27}/gi, '/:id');
  await pool.query(
    'INSERT INTO page_views (visitor_id, user_id, path, referrer, device) VALUES ($1, $2, $3, $4, $5)',
    [vid, userId || null, clean, refHost(referrer, host), deviceOf(ua)]);
  return true;
}

/** Админы хянах самбар: сүүлийн N хоногийн өдөр тутмын статистик + өмнөх ижил хугацаатай харьцуулалт */
export async function dashboard(days) {
  const tz = STATS_TZ;
  const [{ rows: series }, { rows: [tot] }, { rows: [now] }, { rows: pages }, { rows: refs }, { rows: devices }, { rows: [usersAll] }] = await Promise.all([
    pool.query(`
      WITH d AS (
        SELECT generate_series((now() AT TIME ZONE $1)::date - ($2::int - 1), (now() AT TIME ZONE $1)::date, '1 day')::date AS day
      ),
      pv AS (
        SELECT (created_at AT TIME ZONE $1)::date AS day, count(*)::int AS views, count(DISTINCT visitor_id)::int AS visitors
        FROM page_views WHERE created_at >= now() - make_interval(days => $2::int + 1) GROUP BY 1
      ),
      nu AS (
        SELECT (created_at AT TIME ZONE $1)::date AS day, count(*)::int AS n
        FROM users WHERE created_at >= now() - make_interval(days => $2::int + 1) GROUP BY 1
      ),
      po AS (
        SELECT (paid_at AT TIME ZONE $1)::date AS day, count(*)::int AS n, COALESCE(sum(amount), 0)::bigint AS revenue
        FROM orders WHERE status = 'paid' AND paid_at >= now() - make_interval(days => $2::int + 1) GROUP BY 1
      )
      SELECT to_char(d.day, 'YYYY-MM-DD') AS day, COALESCE(pv.visitors, 0) AS visitors, COALESCE(pv.views, 0) AS views,
             COALESCE(nu.n, 0) AS "newUsers", COALESCE(po.n, 0) AS orders, COALESCE(po.revenue, 0)::float8 AS revenue
      FROM d LEFT JOIN pv USING (day) LEFT JOIN nu USING (day) LEFT JOIN po USING (day) ORDER BY d.day`, [tz, days]),
    // Нийт дүн: тухайн хугацаа (cur) ба өмнөх ижил урттай хугацаа (prev)
    pool.query(`
      WITH b AS (SELECT ((now() AT TIME ZONE $1)::date - ($2::int - 1)) AS start, ((now() AT TIME ZONE $1)::date - (2 * $2::int - 1)) AS pstart),
      r AS (SELECT (b.start::timestamp AT TIME ZONE $1) AS cur, (b.pstart::timestamp AT TIME ZONE $1) AS prev FROM b)
      SELECT
        (SELECT count(DISTINCT visitor_id) FROM page_views, r WHERE created_at >= r.cur)::int AS visitors,
        (SELECT count(DISTINCT visitor_id) FROM page_views, r WHERE created_at >= r.prev AND created_at < r.cur)::int AS "visitorsPrev",
        (SELECT count(*) FROM page_views, r WHERE created_at >= r.cur)::int AS views,
        (SELECT count(*) FROM page_views, r WHERE created_at >= r.prev AND created_at < r.cur)::int AS "viewsPrev",
        (SELECT count(*) FROM users, r WHERE created_at >= r.cur)::int AS "newUsers",
        (SELECT count(*) FROM users, r WHERE created_at >= r.prev AND created_at < r.cur)::int AS "newUsersPrev",
        (SELECT COALESCE(sum(amount), 0) FROM orders, r WHERE status = 'paid' AND paid_at >= r.cur)::float8 AS revenue,
        (SELECT COALESCE(sum(amount), 0) FROM orders, r WHERE status = 'paid' AND paid_at >= r.prev AND paid_at < r.cur)::float8 AS "revenuePrev",
        (SELECT count(*) FROM orders, r WHERE status = 'paid' AND paid_at >= r.cur)::int AS orders,
        (SELECT count(*) FROM orders, r WHERE status = 'paid' AND paid_at >= r.prev AND paid_at < r.cur)::int AS "ordersPrev"`, [tz, days]),
    pool.query(`
      SELECT count(DISTINCT visitor_id) FILTER (WHERE created_at >= now() - interval '5 minutes')::int AS online,
             count(DISTINCT visitor_id) FILTER (WHERE (created_at AT TIME ZONE $1)::date = (now() AT TIME ZONE $1)::date)::int AS "todayVisitors",
             count(*) FILTER (WHERE (created_at AT TIME ZONE $1)::date = (now() AT TIME ZONE $1)::date)::int AS "todayViews"
      FROM page_views WHERE created_at >= now() - interval '2 days'`, [tz]),
    pool.query(`
      SELECT path, count(*)::int AS views, count(DISTINCT visitor_id)::int AS visitors
      FROM page_views WHERE created_at >= now() - make_interval(days => $1::int) GROUP BY path ORDER BY views DESC LIMIT 8`, [days]),
    pool.query(`
      SELECT CASE WHEN referrer = '' THEN 'direct' ELSE referrer END AS source, count(DISTINCT visitor_id)::int AS visitors
      FROM page_views WHERE created_at >= now() - make_interval(days => $1::int) GROUP BY 1 ORDER BY visitors DESC LIMIT 6`, [days]),
    pool.query(`
      SELECT device, count(DISTINCT visitor_id)::int AS visitors
      FROM page_views WHERE created_at >= now() - make_interval(days => $1::int) GROUP BY device ORDER BY visitors DESC`, [days]),
    pool.query('SELECT count(*)::int AS n FROM users'),
  ]);
  return { days, tz, series, totals: tot, now, topPages: pages, sources: refs, devices, totalUsers: usersAll.n };
}

/** Хуучин хандалтыг цэвэрлэнэ (анхдагч 400 хоног) */
export async function pruneViews() {
  const keep = Number(process.env.STATS_KEEP_DAYS) || 400;
  await pool.query('DELETE FROM page_views WHERE created_at < now() - make_interval(days => $1::int)', [keep]);
}
