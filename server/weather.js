// Гадаа цаг агаар (Open-Meteo — үнэгүй, API түлхүүр шаардахгүй). 15 минут кэшлэнэ.
const LAT = Number(process.env.WEATHER_LAT) || 47.9186;   // Улаанбаатар
const LON = Number(process.env.WEATHER_LON) || 106.9177;
const CITY = process.env.WEATHER_CITY || 'Улаанбаатар';
const TTL = 15 * 60_000;

let cache = { at: 0, data: null };

const SNOW = new Set([71, 73, 75, 77, 85, 86]);
const isRain = (c) => (c >= 51 && c <= 67) || (c >= 80 && c <= 82) || c >= 95;

/** WMO weather code + салхи → эффект */
export function effectFor(code, wind) {
  if (SNOW.has(code)) return 'snow';
  if (isRain(code)) return 'rain';
  if (wind >= 30) return 'wind';
  return 'none';
}

const LABEL = { snow: 'Цас орж байна', rain: 'Бороо орж байна', wind: 'Салхитай', none: 'Цэлмэг' };

async function fetchCurrent() {
  if (cache.data && Date.now() - cache.at < TTL) return cache.data;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}`
    + '&current=temperature_2m,weather_code,wind_speed_10m,is_day&wind_speed_unit=kmh&timezone=auto';
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const { current: c } = await res.json();
  const data = {
    temp: Math.round(c.temperature_2m),
    code: c.weather_code,
    wind: Math.round(c.wind_speed_10m),
    isDay: c.is_day === 1,
    storm: c.weather_code >= 95,
  };
  cache = { at: Date.now(), data };
  return data;
}

/** mode: auto | off | rain | snow | wind (админ туршиж харах зорилгоор хүчээр сонгож болно) */
export async function weatherFor(mode = 'auto') {
  if (mode === 'off') return { effect: 'none', city: CITY, mode };
  let cur = null;
  try { cur = await fetchCurrent(); } catch (e) { console.error('Цаг агаар татах алдаа:', e.message); }
  const effect = mode === 'auto' ? (cur ? effectFor(cur.code, cur.wind) : 'none') : mode;
  return {
    effect,
    label: LABEL[effect],
    city: CITY,
    mode,
    forced: mode !== 'auto',
    temp: cur?.temp ?? null,
    wind: mode === 'wind' ? Math.max(cur?.wind ?? 0, 40) : cur?.wind ?? 0,
    storm: effect === 'rain' && Boolean(cur?.storm),
  };
}
