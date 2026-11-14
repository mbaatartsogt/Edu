// Автомат хариулагчийн "тархи": түлхүүр үгээр асуултыг таньж хариулт сонгоно.
// Админы оруулсан FAQ + сайтын контентоос (хөтөлбөр, салбар, утас) автоматаар үүсэх хариултууд.

export const norm = (s) => String(s || '').toLowerCase()
  .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

function programsText(programs) {
  if (!programs.length) return 'Хөтөлбөрийн мэдээллийг удахгүй оруулна. Утасны дугаараа үлдээвэл ажилтан холбогдоно.';
  return 'Манай хөтөлбөрүүд:\n\n' + programs.map((p) => {
    const sched = [p.days, p.classTime].filter(Boolean).join(', ');
    return `• ${p.age} нас — ${p.title}${p.level ? ` (${p.level})` : ''}${sched ? `\n   ${sched}` : ''}`;
  }).join('\n');
}

function branchesText(branches, settings) {
  if (!branches.length) return settings.address ? `Манай хаяг: ${settings.address}` : 'Салбарын мэдээллийг удахгүй оруулна.';
  return `Манай ${branches.length} салбар:\n\n` + branches.map((b) =>
    `• ${[b.name, b.region].filter(Boolean).join(' ')}${b.address ? `\n   ${b.address}` : ''}${b.phone ? `\n   Утас: ${b.phone}` : ''}`).join('\n');
}

function contactText(s) {
  return ['Холбоо барих:', s.phone && `Утас: ${s.phone}`, s.email && `И-мэйл: ${s.email}`, s.hours && `Цагийн хуваарь: ${s.hours}`, s.address && `Хаяг: ${s.address}`]
    .filter(Boolean).join('\n');
}

/** Бүх таних боломжтой сэдвүүд */
export function buildIntents({ programs = [], branches = [], settings = {}, faqs = [] }) {
  const branchWords = branches.flatMap((b) => [b.name, b.region]).filter(Boolean);
  return [
    { id: 'greet', keywords: ['сайн байна уу', 'сайн уу', 'сайн байцгаана уу', 'hello', 'hi', 'sain baina uu', 'sn bnu'],
      reply: () => ({ text: 'Сайн байна уу! Танд юугаар туслах вэ?' }) },
    { id: 'thanks', keywords: ['баярлалаа', 'гоё', 'ойлголоо', 'thanks', 'thank you', 'bayarlalaa'],
      reply: () => ({ text: 'Таатай байлаа! Өөр асуух зүйл гарвал бичээрэй.' }) },
    { id: 'programs', label: 'Хөтөлбөрүүд', keywords: ['хөтөлбөр', 'курс', 'хичээл', 'program', 'ielts', 'hutulbur', 'kurs'],
      reply: () => ({ text: programsText(programs) }) },
    { id: 'branches', label: 'Салбарууд', keywords: ['салбар', 'хаяг', 'байршил', 'хаана', 'location', 'salbar', 'hayag', 'haana', ...branchWords],
      reply: () => ({ text: branchesText(branches, settings) }) },
    { id: 'contact', keywords: ['утас', 'дугаар', 'холбоо барих', 'и мэйл', 'имэйл', 'email', 'facebook', 'утсаар', 'utas', 'dugaar'],
      reply: () => ({ text: contactText(settings) }) },
    { id: 'enroll', label: 'Бүртгүүлэх', keywords: ['бүртгүүл', 'бүртгэл', 'элсэх', 'элсэлт', 'элсүүл', 'enroll', 'burtguul', 'elseh'],
      reply: () => ({ text: 'Сайтын дээд буланд байгаа “Нэвтрэх” товчоор орж хөтөлбөрөө сонгоод QPay-аар төлөхөд бүртгэл шууд баталгаажна.', offerLead: true, leadTopic: 'enroll', leadPrompt: 'Эсвэл утасны дугаараа үлдээвэл манай ажилтан бүртгэхэд тусална. Үлдээх үү?' }) },
    { id: 'human', label: 'Асуулт үлдээх', keywords: ['ажилтан', 'оператор', 'хүнтэй', 'залгаарай', 'холбогдоорой', 'асуулт үлдээх'],
      reply: () => ({ text: 'Асуултаа үлдээгээрэй, манай ажилтан тантай холбогдоно.', lead: 'question' }) },
    ...faqs.map((f) => ({
      id: `faq-${f.id}`, label: f.question, question: f.question, keywords: f.keywords,
      reply: () => ({ text: f.answer, offerLead: f.collectLead }),
    })),
  ];
}

/** Хамгийн тохирох сэдвийг олно. Урт түлхүүр үг илүү жинтэй. */
export function matchIntent(text, intents) {
  const t = ` ${norm(text)} `;
  if (!t.trim()) return null;
  let best = null, bestScore = 0;
  for (const it of intents) {
    if (it.question && norm(it.question) === t.trim()) return it;
    let score = 0;
    for (const k of it.keywords) {
      const nk = norm(k);
      if (!nk) continue;
      // Богино латин үгийг (hi гэх мэт) зөвхөн бүтэн үгээр тааруулна
      const hit = nk.length <= 3 ? t.includes(` ${nk} `) : t.includes(nk);
      if (hit) score += nk.length;
    }
    if (score > bestScore) { best = it; bestScore = score; }
  }
  return best;
}

export const isPhone = (s) => String(s).replace(/\D/g, '').length === 8;
