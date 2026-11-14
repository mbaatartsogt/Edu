// И-мэйл илгээх (SMTP). SMTP тохируулаагүй бол линкийг серверийн терминал дээр хэвлэнэ.
import nodemailer from 'nodemailer';

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env;

export const mailEnabled = Boolean(SMTP_HOST);
const transport = mailEnabled
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: Number(SMTP_PORT) === 465,
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    })
  : null;

if (!mailEnabled) console.warn('ℹ️  SMTP тохируулаагүй — и-мэйлийн линкүүд энэ терминал дээр хэвлэгдэнэ.');

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function layout({ title, intro, button, link, outro }) {
  return `<!doctype html><html lang="mn"><body style="margin:0;background:#EAF3FF;font-family:Montserrat,Arial,sans-serif;color:#0B1F4D">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:24px;overflow:hidden">
      <tr><td style="background:#0A6CF5;padding:24px 32px;color:#fff">
        <div style="font-size:26px;font-weight:900;letter-spacing:-.5px">MindEdu<sup style="font-size:10px">®</sup></div>
        <div style="font-size:10px;font-weight:600;letter-spacing:1.5px;opacity:.9">АНГЛИ ХЭЛНИЙ СУРГАЛТЫН ТӨВ</div>
      </td></tr>
      <tr><td style="padding:32px">
        <h1 style="margin:0 0 12px;font-size:22px">${esc(title)}</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#4A5B82">${intro}</p>
        <a href="${esc(link)}" style="display:inline-block;background:#F6C530;color:#0B1F4D;text-decoration:none;font-weight:800;letter-spacing:1px;text-transform:uppercase;font-size:14px;padding:16px 28px;border-radius:999px">${esc(button)}</a>
        <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#4A5B82">${outro}<br>Товч ажиллахгүй бол энэ холбоосыг хөтөч дээрээ хуулна уу:<br><a href="${esc(link)}" style="color:#0A6CF5;word-break:break-all">${esc(link)}</a></p>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

async function send({ to, subject, html, text, link }) {
  if (!transport) {
    console.log(`\n📧 [И-мэйл илгээгдсэнгүй — SMTP байхгүй]\n   Хэнд: ${to}\n   Гарчиг: ${subject}\n   Линк: ${link}\n`);
    return { dev: true };
  }
  await transport.sendMail({ from: MAIL_FROM || SMTP_USER, to, subject, html, text });
  return { dev: false };
}

export function sendVerifyEmail(user, link) {
  return send({
    to: user.email, link,
    subject: 'MindEdu — и-мэйл хаягаа баталгаажуулна уу',
    text: `Сайн байна уу, ${user.name}!\n\nMindEdu-д бүртгүүлсэнд баярлалаа. Бүртгэлээ баталгаажуулахын тулд дараах холбоос дээр дарна уу (24 цаг хүчинтэй):\n${link}`,
    html: layout({
      title: `Сайн байна уу, ${user.name}!`,
      intro: 'MindEdu-д бүртгүүлсэнд баярлалаа. Бүртгэлээ идэвхжүүлэхийн тулд доорх товч дээр дарж и-мэйл хаягаа баталгаажуулна уу.',
      button: 'Баталгаажуулах', link,
      outro: 'Холбоос 24 цагийн турш хүчинтэй. Та бүртгүүлээгүй бол энэ захидлыг үл тоомсорлоно уу.',
    }),
  });
}

export function sendResetEmail(user, link) {
  return send({
    to: user.email, link,
    subject: 'MindEdu — нууц үг сэргээх',
    text: `Сайн байна уу, ${user.name}!\n\nНууц үгээ шинээр тохируулахын тулд дараах холбоос дээр дарна уу (1 цаг хүчинтэй):\n${link}`,
    html: layout({
      title: 'Нууц үг сэргээх',
      intro: `Сайн байна уу, ${esc(user.name)}! Таны бүртгэлийн нууц үгийг сэргээх хүсэлт ирлээ. Доорх товч дээр дарж шинэ нууц үг тохируулна уу.`,
      button: 'Нууц үг солих', link,
      outro: 'Холбоос 1 цагийн турш хүчинтэй. Та хүсэлт илгээгээгүй бол энэ захидлыг үл тоомсорлоно уу — таны нууц үг өөрчлөгдөхгүй.',
    }),
  });
}
