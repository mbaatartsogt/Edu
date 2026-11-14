// Видео файл хадгалах, тоглуулах холбоос үүсгэх
import { createWriteStream } from 'node:fs';
import { mkdir, unlink } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Render, Railway дээр байршуулах бол Persistent Disk холбоод VIDEO_DIR-ийг тэр зам руу заана
export const VIDEO_DIR = path.resolve(process.env.VIDEO_DIR || path.join(__dirname, 'uploads', 'videos'));
export const VIDEO_MAX_MB = Number(process.env.VIDEO_MAX_MB) || 2048;
const VIDEO_MAX_BYTES = VIDEO_MAX_MB * 1024 * 1024;

export const VIDEO_MIMES = { 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov', 'video/x-m4v': 'm4v' };

const UPLOADED_RE = /^\/api\/videos\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
export const uploadedVideoId = (v) => UPLOADED_RE.exec(String(v || ''))?.[1] ?? null;
export const isVideoValue = (v) => Boolean(uploadedVideoId(v)) || /^https:\/\/[^\s<>"]+$/i.test(String(v || ''));

export const videoFilePath = (id, mime) => path.join(VIDEO_DIR, `${id}.${VIDEO_MIMES[mime] || 'mp4'}`);

export class UploadError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

/** Хүсэлтийн биеийг (raw video) шууд дискэнд бичнэ — санах ойд бүхлээр нь ачаалахгүй */
export async function saveUpload(req, { mime, name }) {
  if (!VIDEO_MIMES[mime]) throw new UploadError(415, 'MP4, WEBM, MOV эсвэл M4V видео оруулна уу.');
  const declared = Number(req.headers['content-length']);
  if (declared > VIDEO_MAX_BYTES) throw new UploadError(413, `Видео ${VIDEO_MAX_MB}MB-аас бага байх ёстой.`);

  await mkdir(VIDEO_DIR, { recursive: true });
  const { rows: [row] } = await pool.query(
    'INSERT INTO videos (original_name, mime) VALUES ($1, $2) RETURNING id', [String(name || '').slice(0, 200), mime]);
  const dest = videoFilePath(row.id, mime);

  let size = 0;
  const limiter = new Transform({
    transform(chunk, _enc, cb) {
      size += chunk.length;
      if (size > VIDEO_MAX_BYTES) cb(new UploadError(413, `Видео ${VIDEO_MAX_MB}MB-аас бага байх ёстой.`));
      else cb(null, chunk);
    },
  });

  try {
    await pipeline(req, limiter, createWriteStream(dest));
    if (!size) throw new UploadError(400, 'Хоосон файл байна.');
  } catch (e) {
    await unlink(dest).catch(() => {});
    await pool.query('DELETE FROM videos WHERE id = $1', [row.id]);
    throw e instanceof UploadError ? e : new UploadError(400, 'Видео хуулах үед холболт тасарлаа. Дахин оролдоно уу.');
  }
  await pool.query('UPDATE videos SET size = $2 WHERE id = $1', [row.id, size]);
  return { id: row.id, url: `/api/videos/${row.id}`, size };
}

export async function getVideo(id) {
  const { rows } = await pool.query('SELECT id, mime, size, original_name AS "name" FROM videos WHERE id = $1', [id]);
  return rows[0] ?? null;
}

/** Хичээлээс хасагдсан видео файлуудыг устгана (өөр хичээл ашиглаж байвал үлдээнэ) */
export async function deleteVideos(values) {
  const ids = values.map(uploadedVideoId).filter(Boolean);
  if (!ids.length) return;
  const { rows } = await pool.query(
    `DELETE FROM videos v WHERE v.id = ANY($1::uuid[])
       AND NOT EXISTS (SELECT 1 FROM lessons l WHERE l.video = '/api/videos/' || v.id::text)
     RETURNING id, mime`, [ids]);
  await Promise.all(rows.map((r) => unlink(videoFilePath(r.id, r.mime)).catch(() => {})));
}

/** Хуулсан боловч хичээлд холбогдоогүй (маягтаа хадгалалгүй хаасан) файлуудыг 1 хоногийн дараа цэвэрлэнэ */
export async function cleanupOrphanVideos() {
  const { rows } = await pool.query(
    `DELETE FROM videos v WHERE v.created_at < now() - interval '1 day'
       AND NOT EXISTS (SELECT 1 FROM lessons l WHERE l.video = '/api/videos/' || v.id::text)
     RETURNING id, mime`);
  await Promise.all(rows.map((r) => unlink(videoFilePath(r.id, r.mime)).catch(() => {})));
  if (rows.length) console.log(`🧹 Ашиглагдаагүй ${rows.length} видео файл устгалаа`);
}

/**
 * Холбоосыг тоглуулагч болгоно.
 * kind: 'file' → <video>, 'iframe' → embed (YouTube, Vimeo, Google Drive, бусад)
 */
export function playerFor(value) {
  const v = String(value || '').trim();
  if (uploadedVideoId(v)) return { kind: 'file', uploaded: true, src: v };

  let m = /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([\w-]{11})/i.exec(v);
  if (m) {
    return {
      kind: 'iframe', provider: 'youtube',
      src: `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0&modestbranding=1&playsinline=1`,
      thumbnail: `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg`,
    };
  }
  m = /vimeo\.com\/(?:video\/|channels\/[\w-]+\/|groups\/[\w-]+\/videos\/)?(\d+)(?:\/([\da-f]{6,}))?/i.exec(v);
  if (m) {
    const hash = m[2] || /[?&]h=([\da-f]+)/i.exec(v)?.[1];
    return { kind: 'iframe', provider: 'vimeo', src: `https://player.vimeo.com/video/${m[1]}?dnt=1${hash ? `&h=${hash}` : ''}` };
  }
  m = /drive\.google\.com\/(?:file\/d\/|open\?id=)([\w-]{10,})/i.exec(v);
  if (m) return { kind: 'iframe', provider: 'drive', src: `https://drive.google.com/file/d/${m[1]}/preview` };
  if (/\.(mp4|webm|m4v|mov|ogv)(\?|#|$)/i.test(v)) return { kind: 'file', src: v };
  return { kind: 'iframe', provider: 'other', src: v };
}
