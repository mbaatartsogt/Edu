// SMS илгээх. Ямар ч SMS үйлчилгээ (MessagePro, Unitel, Mobicom, Skytel, Twilio гэх мэт)-ний HTTP API-тай
// ажиллахаар загвараар тохируулна. Тохируулаагүй бол кодыг серверийн терминал дээр хэвлэнэ.
//
// SMS_URL     — хүсэлтийн хаяг. {to}, {to976}, {text}, {from} орлуулагдана (URL-д кодлогдоно)
// SMS_METHOD  — GET (анхдагч) эсвэл POST
// SMS_HEADERS — JSON, жишээ: {"x-api-key":"..."}
// SMS_BODY    — POST үед биеийн загвар, жишээ: {"to":"{to}","text":"{text}"}
// SMS_FROM    — илгээгчийн дугаар / нэр
const { SMS_URL, SMS_METHOD = 'GET', SMS_HEADERS, SMS_BODY, SMS_FROM = '' } = process.env;

export const smsEnabled = Boolean(SMS_URL);
if (!smsEnabled) console.warn('ℹ️  SMS тохируулаагүй — OTP кодууд энэ терминал дээр хэвлэгдэнэ.');

let headers = {};
try { headers = SMS_HEADERS ? JSON.parse(SMS_HEADERS) : {}; } catch { console.error('❌ SMS_HEADERS буруу JSON байна.'); }

function fill(template, vars, encode) {
  return template.replace(/\{(to|to976|text|from)\}/g, (_, k) => encode(vars[k]));
}

export async function sendSms(phone, text) {
  if (!smsEnabled) {
    console.log(`\n📱 [SMS илгээгдсэнгүй — SMS_URL байхгүй]\n   Хэнд: ${phone}\n   Мессеж: ${text}\n`);
    return { dev: true };
  }
  const vars = { to: phone, to976: `976${phone}`, text, from: SMS_FROM };
  const url = fill(SMS_URL, vars, encodeURIComponent);
  const method = SMS_METHOD.toUpperCase();
  const body = method === 'POST' && SMS_BODY ? fill(SMS_BODY, vars, (v) => JSON.stringify(String(v)).slice(1, -1)) : undefined;
  const res = await fetch(url, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body,
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`SMS илгээх алдаа: ${res.status} ${(await res.text().catch(() => '')).slice(0, 200)}`);
  return { dev: false };
}
