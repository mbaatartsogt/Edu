// Хөтөлбөр, багш, салбар, тохиргооны өгөгдлийн давхарга (PostgreSQL)
import { pool } from './db.js';
import { seed, seedSettings, previousSeedSettings } from './seed.js';
import { deleteVideos, isVideoValue } from './videos.js';

export const PROGRAM_THEMES = ['sky', 'blue', 'royal', 'coral', 'mint'];
export const BRANCH_THEMES = ['blue', 'sky', 'sand', 'olive', 'dusk'];
export const SEASONS = ['default', 'christmas', 'newyear', 'tsagaansar', 'naadam'];
export const WEATHER_MODES = ['auto', 'off', 'rain', 'snow', 'wind'];
export const HERO_STYLES = ['mosaic', 'follow', 'letters'];

// type: text | list (мөр бүр нэг зүйл) | bool | enum | url | image
const RESOURCES = {
  programs: {
    age: { type: 'text', max: 20, required: true },
    title: { type: 'text', max: 60, required: true },
    level: { type: 'text', max: 40 },
    goals: { type: 'list', max: 120, maxItems: 8 },
    days: { type: 'text', max: 80 },
    classTime: { type: 'text', max: 80 },
    price: { type: 'int', min: 0, max: 100_000_000 },
    priceLabel: { type: 'text', max: 40 },
    billingDays: { type: 'int', min: 0, max: 3650 },
    capacity: { type: 'int', min: 0, max: 100_000, nullable: true },
    theme: { type: 'enum', values: PROGRAM_THEMES },
    visible: { type: 'bool' },
  },
  teachers: {
    name: { type: 'text', max: 60, required: true },
    role: { type: 'text', max: 80 },
    bio: { type: 'text', max: 300 },
    badges: { type: 'list', max: 24, maxItems: 5 },
    photo: { type: 'image' },
    visible: { type: 'bool' },
  },
  branches: {
    name: { type: 'text', max: 40, required: true },
    region: { type: 'text', max: 40 },
    address: { type: 'text', max: 200 },
    phone: { type: 'text', max: 40 },
    hours: { type: 'text', max: 80 },
    mapUrl: { type: 'url' },
    theme: { type: 'enum', values: BRANCH_THEMES },
    bgImage: { type: 'image' },
    kidsImage: { type: 'image' },
    visible: { type: 'bool' },
  },
  rewards: {
    title: { type: 'text', max: 80, required: true },
    description: { type: 'text', max: 300 },
    image: { type: 'image' },
    pointsCost: { type: 'int', min: 0, max: 10_000_000 },
    stock: { type: 'int', min: 0, max: 1_000_000, nullable: true },
    visible: { type: 'bool' },
  },
  lessons: {
    programId: { type: 'uuid', nullable: true },
    module: { type: 'text', max: 80 },
    title: { type: 'text', max: 120, required: true },
    description: { type: 'text', max: 2000 },
    video: { type: 'video', required: true },
    duration: { type: 'text', max: 20 },
    thumbnail: { type: 'image' },
    isFree: { type: 'bool' },
    visible: { type: 'bool' },
  },
  faqs: {
    question: { type: 'text', max: 120, required: true },
    keywords: { type: 'list', max: 40, maxItems: 20 },
    answer: { type: 'text', max: 1000, required: true },
    collectLead: { type: 'bool' },
    visible: { type: 'bool' },
  },
};

export const SETTINGS = {
  facebook: 'url', instagram: 'url', threads: 'url', messenger: 'url',
  phone: 'text', email: 'text', hours: 'text', address: 'text', mapUrl: 'url',
  chatGreeting: 'text',
  heroImage: { type: 'image' },
  heroStyle: { type: 'enum', values: HERO_STYLES },
  heroCharacter: { type: 'image' },
  pointsPer1000: 'int', pointsSignup: 'int',
  seasonTheme: { type: 'enum', values: SEASONS },
  weatherMode: { type: 'enum', values: WEATHER_MODES },
};

export const isResource = (name) => Object.hasOwn(RESOURCES, name);
const snake = (k) => k.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());

// ---------- Оролтыг шалгах ----------
function clean(type, f, v) {
  switch (type) {
    case 'list':
      return { v: (Array.isArray(v) ? v : String(v ?? '').split('\n'))
        .map((s) => String(s).trim()).filter(Boolean).slice(0, f.maxItems ?? 10).map((s) => s.slice(0, f.max ?? 120)) };
    case 'bool':
      return { v: v === true || v === 'true' };
    case 'int': {
      if (f.nullable && (v === null || v === undefined || String(v).trim() === '')) return { v: null };
      const n = Number(String(v ?? '').replace(/[\s,₮]/g, '') || 0);
      return Number.isInteger(n) && n >= (f.min ?? 0) && n <= (f.max ?? 1e9) ? { v: n } : { err: 'Бүхэл тоо оруулна уу.' };
    }
    case 'enum':
      return f.values.includes(v) ? { v } : { err: 'Буруу утга.' };
    case 'url': {
      const s = String(v ?? '').trim();
      return !s || /^https?:\/\/\S+$/i.test(s) ? { v: s.slice(0, 500) } : { err: 'https://-ээр эхэлсэн холбоос оруулна уу.' };
    }
    case 'uuid': {
      const s = String(v ?? '').trim();
      if (!s) return f.nullable ? { v: null } : { err: 'Заавал сонгоно.' };
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s) ? { v: s } : { err: 'Буруу утга.' };
    }
    case 'video': {
      const s = String(v ?? '').trim();
      if (!s) return f.required ? { err: 'Видео холбоос оруулах эсвэл файл хуулна уу.' } : { v: '' };
      return isVideoValue(s) ? { v: s.slice(0, 1000) } : { err: 'https://-ээр эхэлсэн холбоос оруулна уу.' };
    }
    case 'image': {
      const s = String(v ?? '').trim();
      return !s || /^\/[\w\-./]+$/.test(s) ? { v: s } : { err: 'Буруу зураг.' };
    }
    default: {
      const s = String(v ?? '').trim().slice(0, f.max ?? 200);
      return f.required && !s ? { err: 'Заавал бөглөнө.' } : { v: s };
    }
  }
}

export function sanitize(name, body = {}, { partial = false } = {}) {
  const data = {}, errors = {};
  for (const [k, f] of Object.entries(RESOURCES[name])) {
    if (!(k in body)) {
      if (!partial && f.required) errors[k] = 'Заавал бөглөнө.';
      continue;
    }
    const { v, err } = clean(f.type, f, body[k]);
    if (err) errors[k] = err; else data[k] = v;
  }
  return { data, errors };
}

export function sanitizeSettings(body = {}) {
  const data = {}, errors = {};
  for (const [k, def] of Object.entries(SETTINGS)) {
    if (!(k in body)) continue;
    const type = typeof def === 'string' ? def : def.type;
    const f = typeof def === 'string' ? (type === 'int' ? { min: 0, max: 1_000_000 } : { max: 400 }) : def;
    const { v, err } = clean(type, f, body[k]);
    if (err) errors[k] = err; else data[k] = String(v);
  }
  return { data, errors };
}

// ---------- Зураг ----------
const imageIdFromUrl = (u) => /^\/api\/images\/([0-9a-f-]{36})$/i.exec(u || '')?.[1];
const imageFields = (name) => Object.entries(RESOURCES[name]).filter(([, f]) => f.type === 'image').map(([k]) => k);
const videoFields = (name) => Object.entries(RESOURCES[name]).filter(([, f]) => f.type === 'video').map(([k]) => k);

async function deleteImages(urls) {
  const ids = urls.map(imageIdFromUrl).filter(Boolean);
  if (ids.length) await pool.query('DELETE FROM images WHERE id = ANY($1::uuid[])', [ids]);
}

export const images = {
  async create(mime, buffer) {
    const { rows } = await pool.query('INSERT INTO images (mime, data) VALUES ($1, $2) RETURNING id', [mime, buffer]);
    return { id: rows[0].id, url: `/api/images/${rows[0].id}` };
  },
  async get(id) {
    const { rows } = await pool.query('SELECT mime, data FROM images WHERE id = $1', [id]);
    return rows[0] ?? null;
  },
};

// ---------- Ерөнхий CRUD ----------
function resource(name) {
  const fields = Object.keys(RESOURCES[name]);
  const select = ['id', ...fields.map((k) => `${snake(k)} AS "${k}"`)].join(', ');

  return {
    async list({ onlyVisible = false } = {}) {
      const { rows } = await pool.query(
        `SELECT ${select} FROM ${name} ${onlyVisible ? 'WHERE visible' : ''} ORDER BY sort_order, created_at`);
      return rows;
    },
    async create(data) {
      const keys = Object.keys(data);
      const { rows } = await pool.query(
        `INSERT INTO ${name} (${keys.map(snake).join(', ')}, sort_order)
         VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')}, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM ${name}))
         RETURNING ${select}`,
        keys.map((k) => data[k]));
      return rows[0];
    },
    async update(id, data) {
      const keys = Object.keys(data);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { rows: [old] } = await client.query(`SELECT ${select} FROM ${name} WHERE id = $1 FOR UPDATE`, [id]);
        if (!old) { await client.query('ROLLBACK'); return null; }
        let row = old;
        if (keys.length) {
          ({ rows: [row] } = await client.query(
            `UPDATE ${name} SET ${keys.map((k, i) => `${snake(k)} = $${i + 2}`).join(', ')}, updated_at = now()
             WHERE id = $1 RETURNING ${select}`,
            [id, ...keys.map((k) => data[k])]));
        }
        await client.query('COMMIT');
        // Солигдсон хуучин зургийг устгана
        await deleteImages(imageFields(name).filter((k) => old[k] !== row[k]).map((k) => old[k]));
        await deleteVideos(videoFields(name).filter((k) => old[k] !== row[k]).map((k) => old[k]));
        return row;
      } catch (e) {
        await client.query('ROLLBACK').catch(() => {});
        throw e;
      } finally {
        client.release();
      }
    },
    async remove(id) {
      const { rows: [old] } = await pool.query(`DELETE FROM ${name} WHERE id = $1 RETURNING ${select}`, [id]);
      if (!old) return false;
      await deleteImages(imageFields(name).map((k) => old[k]));
      await deleteVideos(videoFields(name).map((k) => old[k]));
      return true;
    },
    async reorder(ids) {
      await pool.query(
        `UPDATE ${name} AS t SET sort_order = o.idx
         FROM unnest($1::uuid[]) WITH ORDINALITY AS o(id, idx) WHERE t.id = o.id`, [ids]);
    },
  };
}

export const content = Object.fromEntries(Object.keys(RESOURCES).map((n) => [n, resource(n)]));

export const settings = {
  async get() {
    const { rows } = await pool.query('SELECT key, value FROM settings');
    const out = Object.fromEntries(Object.keys(SETTINGS).map((k) => [k, '']));
    for (const r of rows) if (r.key in out) out[r.key] = r.value;
    return out;
  },
  async save(data) {
    const keys = Object.keys(data);
    if (keys.length) {
      await pool.query(
        `INSERT INTO settings (key, value) SELECT * FROM unnest($1::text[], $2::text[])
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [keys, keys.map((k) => data[k])]);
    }
    return this.get();
  },
};

/** Хүснэгт хоосон бол жишээ контентоор дүүргэнэ */
export async function seedContent() {
  await pool.query(
    `INSERT INTO settings (key, value) SELECT * FROM unnest($1::text[], $2::text[]) ON CONFLICT DO NOTHING`,
    [Object.keys(seedSettings), Object.values(seedSettings)]);
  // Хуучин жишээ утгаараа үлдсэн тохиргоог шинэчилнэ (админы оруулсан утгад хүрэхгүй)
  for (const old of previousSeedSettings) {
    for (const [k, v] of Object.entries(old)) {
      await pool.query('UPDATE settings SET value = $1 WHERE key = $2 AND value = $3', [seedSettings[k], k, v]);
    }
  }
  for (const [name, rows] of Object.entries(seed)) {
    const { rows: [{ n }] } = await pool.query(`SELECT count(*)::int AS n FROM ${name}`);
    if (n === 0) for (const r of rows) await content[name].create(r);
  }
}
