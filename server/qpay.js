// QPay v2 merchant API (https://merchant.qpay.mn)
// QPAY_MODE: live | sandbox | demo (default demo — жинхэнэ мөнгө хөдлөхгүй, туршилтын товчоор төлсөн болгоно)

export const QPAY_MODE = ['live', 'sandbox', 'demo'].includes(process.env.QPAY_MODE) ? process.env.QPAY_MODE : 'demo';
const BASE = process.env.QPAY_BASE_URL || (QPAY_MODE === 'live' ? 'https://merchant.qpay.mn' : 'https://merchant-sandbox.qpay.mn');
const { QPAY_USERNAME, QPAY_PASSWORD, QPAY_INVOICE_CODE } = process.env;

export const isDemo = QPAY_MODE === 'demo';

if (!isDemo && (!QPAY_USERNAME || !QPAY_PASSWORD || !QPAY_INVOICE_CODE)) {
  console.warn('⚠️  QPAY_MODE=' + QPAY_MODE + ' боловч QPAY_USERNAME / QPAY_PASSWORD / QPAY_INVOICE_CODE тохируулаагүй байна.');
}

let token = null;
let tokenExpiresAt = 0;

async function call(path, { method = 'POST', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) headers.Authorization = `Bearer ${await getToken()}`;
  else headers.Authorization = 'Basic ' + Buffer.from(`${QPAY_USERNAME}:${QPAY_PASSWORD}`).toString('base64');
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15_000) });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && auth) token = null;
  if (!res.ok) {
    const err = new Error(`QPay ${path} → ${res.status} ${data.error_code || data.message || ''}`);
    err.qpay = data;
    throw err;
  }
  return data;
}

async function getToken() {
  if (token && Date.now() < tokenExpiresAt - 60_000) return token;
  const d = await call('/v2/auth/token', { auth: false });
  token = d.access_token;
  // expires_in нь unix секунд эсвэл үлдсэн секунд байж болно
  const exp = Number(d.expires_in) || 0;
  tokenExpiresAt = exp > 1e9 ? exp * 1000 : Date.now() + (exp || 3600) * 1000;
  return token;
}

/** Нэхэмжлэх үүсгэж QR болон банкны апп-уудын холбоосыг буцаана */
export async function createInvoice({ orderNo, amount, description, callbackUrl, receiverCode }) {
  if (isDemo) {
    return { invoiceId: `demo-${orderNo}`, qrImage: null, qrText: `DEMO:${orderNo}:${amount}`, shortUrl: null, urls: [] };
  }
  const d = await call('/v2/invoice', {
    body: {
      invoice_code: QPAY_INVOICE_CODE,
      sender_invoice_no: orderNo,
      invoice_receiver_code: receiverCode || 'terminal',
      invoice_description: description.slice(0, 255),
      amount,
      callback_url: callbackUrl,
    },
  });
  return {
    invoiceId: d.invoice_id,
    qrImage: d.qr_image ? `data:image/png;base64,${d.qr_image}` : null,
    qrText: d.qr_text,
    shortUrl: d.qPay_shortUrl || null,
    urls: (d.urls || []).map((u) => ({ name: u.name, description: u.description, logo: u.logo, link: u.link })),
  };
}

/** Нэхэмжлэх төлөгдсөн эсэхийг QPay-аас шалгана (callback-д шууд итгэхгүй) */
export async function isInvoicePaid(invoiceId, amount) {
  if (isDemo) return false;
  const d = await call('/v2/payment/check', {
    body: { object_type: 'INVOICE', object_id: invoiceId, offset: { page_number: 1, page_limit: 100 } },
  });
  const paidRows = (d.rows || []).filter((r) => r.payment_status === 'PAID');
  const paid = Number(d.paid_amount) || paidRows.reduce((s, r) => s + Number(r.payment_amount || 0), 0);
  return paidRows.length > 0 && paid >= amount;
}

export async function cancelInvoice(invoiceId) {
  if (isDemo || !invoiceId) return;
  await call(`/v2/invoice/${invoiceId}`, { method: 'DELETE' }).catch(() => {});
}
