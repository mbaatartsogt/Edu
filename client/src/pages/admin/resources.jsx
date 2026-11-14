// Админ панелийн засварлах хэсгүүдийн тохиргоо: ямар талбартай, карт нь яаж харагдах
import { branchThemes, programThemes, themeCls } from '../../data/themes';
import Icon from '../../components/ui/Icon';

const Thumb = ({ src, className }) => (src
  ? <img src={src} alt="" className={className} onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
  : null);

export const programsConfig = {
  resource: 'programs',
  title: 'Хөтөлбөрүүд',
  description: 'Насны бүлэг тус бүрийн хөтөлбөр. Сумаар дарааллыг өөрчилнө, нүдний тэмдгээр сайтаас түр нууна.',
  addLabel: 'Хөтөлбөр нэмэх',
  defaults: { age: '', title: '', level: '', goals: [], days: '', classTime: '', price: 0, priceLabel: '/ сар', billingDays: 30, capacity: '', theme: 'sky', visible: true },
  fields: [
    { name: 'age', label: 'Насны бүлэг', required: true, placeholder: '8–11' },
    { name: 'title', label: 'Хөтөлбөрийн нэр', required: true, placeholder: 'Young Explorers' },
    { name: 'level', label: 'Түвшин', placeholder: 'Starter → A1' },
    { name: 'goals', label: 'Зорилго', type: 'list', help: 'Мөр бүрт нэг зорилго (8 хүртэл).', placeholder: 'Үг цээжлэх, авиа зөв дуудах\nЭнгийн өгүүлбэр уншиж, бичих' },
    { name: 'days', label: 'Хичээллэх өдрүүд', placeholder: 'Даваа · Лхагва · Баасан' },
    { name: 'classTime', label: 'Цаг', placeholder: '17:00–18:30' },
    { name: 'price', label: 'Төлбөр (₮)', inputType: 'number', placeholder: '250000', help: '0 бол сайт дээр “Үнийг утсаар лавлана уу” гэж гарч, онлайнаар захиалах боломжгүй.' },
    { name: 'priceLabel', label: 'Төлбөрийн тайлбар', placeholder: '/ сар', help: 'Үнийн ард жижгээр гарна. Жишээ: / сар, / улирал, 3 сарын' },
    { name: 'billingDays', label: 'Төлбөрийн давтамж (хоног)', inputType: 'number', placeholder: '30', help: 'Дараагийн төлбөр хэдэн хоногийн дараа гэдгийг тооцоолно. Сар бол 30, улирал бол 90, нэг удаагийн бол 0.' },
    { name: 'capacity', label: 'Ангийн багтаамж (хүүхэд)', inputType: 'number', placeholder: '15', help: 'Хоосон бол хязгааргүй. “Хөтөлбөр, сурагчид” хэсэгт дүүргэлтийг харуулна.' },
    { name: 'theme', label: 'Өнгө', type: 'theme', themes: programThemes },
    { name: 'visible', label: 'Сайт дээр харуулах', type: 'bool' },
  ],
  banner: (items) => {
    const noPrice = items.filter((p) => p.visible && !p.price);
    if (!noPrice.length) return null;
    return (
      <div role="alert" className="flex flex-wrap items-start gap-3 rounded-3xl border-2 border-brand-yellow bg-white p-5">
        <span className="icon3d-y !h-11 !w-11 shrink-0"><Icon name="card" className="h-6 w-6 text-brand-royal" /></span>
        <div className="min-w-0 flex-1">
          <p className="font-extrabold">{noPrice.length} хөтөлбөрт үнэ тохируулаагүй байна</p>
          <p className="text-sm text-ink-soft">Үнэгүй хөтөлбөрийг эцэг эхчүүд онлайнаар сонгож төлөх боломжгүй. “Засах” дарж <b>Төлбөр (₮)</b> талбарт үнээ оруулна уу: {noPrice.map((p) => p.title).join(', ')}.</p>
        </div>
      </div>
    );
  },
  preview: (p) => (
    <div>
      <div className={`bg-gradient-to-br ${themeCls(programThemes, p.theme)} p-5 text-white`}>
        <p className="text-3xl font-black leading-none">{p.age}<span className="ml-1 text-sm font-semibold">нас</span></p>
        <p className="mt-1 font-bold">{p.title}</p>
        {p.level && <span className="mt-2 inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold">{p.level}</span>}
      </div>
      <div className="grid gap-1 p-4 text-sm text-ink-soft">
        <p className="font-extrabold text-ink">{p.price > 0 ? `${new Intl.NumberFormat('en-US').format(p.price)}₮ ${p.priceLabel}` : 'Үнэ тохируулаагүй'}</p>
        <p>{p.goals.length} зорилго</p>
        {(p.days || p.classTime) && <p className="font-semibold text-ink">{[p.days, p.classTime].filter(Boolean).join(' · ')}</p>}
      </div>
    </div>
  ),
};

export const teachersConfig = {
  resource: 'teachers',
  title: 'Багш нар',
  description: 'Нүүр хуудсанд багш нар “тайзан дээр” зогсож харагдана: сонгосон багш голд тод, бусад нь ард бүдэг. Дэвсгэргүй (тунгалаг PNG) зураг оруулбал хүн шууд тайзан дээр зогсоно, энгийн зураг бол нуман хүрээтэй хөрөг болно.',
  addLabel: 'Багш нэмэх',
  defaults: { name: '', role: '', bio: '', badges: [], photo: '', visible: true },
  fields: [
    { name: 'photo', label: 'Зураг', type: 'image', maxSize: 1200, aspect: 'aspect-[4/5]', help: 'Хамгийн гоё нь: бүсэлхийгээс дээш эсвэл бүтэн биеийн, дэвсгэрийг нь арилгасан PNG (remove.bg, Canva → Background remover). Бүх багшийг ижил өндөр, ижил өнцгөөс авбал жигд харагдана.' },
    { name: 'name', label: 'Нэр', required: true, placeholder: 'Б. Номин' },
    { name: 'role', label: 'Албан тушаал / анги', placeholder: 'Ахлах багш · 8–11 нас' },
    { name: 'bio', label: 'Товч танилцуулга', type: 'textarea', placeholder: 'Хүүхэдтэй ажиллах 8 жилийн туршлагатай…' },
    { name: 'badges', label: 'Тэмдэг (сертификат, туршлага)', type: 'list', rows: 3, help: 'Мөр бүрт нэг (5 хүртэл). Жишээ: CELTA, 8 жил', placeholder: 'CELTA\n8 жил' },
    { name: 'visible', label: 'Сайт дээр харуулах', type: 'bool' },
  ],
  preview: (t) => (
    <div className="flex gap-4 p-4">
      <div className="h-24 w-20 shrink-0 overflow-hidden rounded-2xl bg-brand-mist">
        <Thumb src={t.photo} className="h-full w-full object-contain object-bottom" />
      </div>
      <div className="min-w-0">
        <p className="font-extrabold">{t.name}</p>
        {t.role && <p className="text-sm font-bold text-brand-blue">{t.role}</p>}
        {t.bio && <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{t.bio}</p>}
        <div className="mt-2 flex flex-wrap gap-1">
          {t.badges.map((b) => <span key={b} className="rounded-full bg-brand-mist px-2 py-0.5 text-[.7rem] font-bold text-brand-royal">{b}</span>)}
        </div>
      </div>
    </div>
  ),
};

export const branchesConfig = {
  resource: 'branches',
  title: 'Салбарууд',
  description: 'Сайтын “Манай салбарууд” хэсэгт гарна. Хүүхдийн зургийг тунгалаг дэвсгэртэй PNG-ээр оруулбал карт дээр гоё харагдана.',
  addLabel: 'Салбар нэмэх',
  defaults: { name: '', region: '', address: '', phone: '', hours: '', mapUrl: '', theme: 'blue', bgImage: '', kidsImage: '', visible: true },
  fields: [
    { name: 'name', label: 'Салбарын нэр (1-р мөр)', required: true, placeholder: 'Darkhan', help: 'Карт дээр том үсгээр гарна.' },
    { name: 'region', label: '2-р мөр (хот, аймаг)', placeholder: 'City' },
    { name: 'address', label: 'Хаяг', type: 'textarea', rows: 2, placeholder: 'Дархан-Уул аймаг, Дархан хот, Энх оршихуй төв 2 давхар' },
    { name: 'phone', label: 'Утас', placeholder: '9119-1971' },
    { name: 'hours', label: 'Ажлын цаг', placeholder: 'Даваа–Бямба · 10:00–20:00' },
    { name: 'mapUrl', label: 'Google Maps холбоос', inputType: 'url', placeholder: 'https://maps.app.goo.gl/…', help: 'Хоосон орхивол хаягаар хайлт хийнэ.' },
    { name: 'theme', label: 'Картын өнгө', type: 'theme', themes: branchThemes },
    { name: 'bgImage', label: 'Арын зураг (хотын дүр төрх)', type: 'image', maxSize: 1600, aspect: 'aspect-[16/9]' },
    { name: 'kidsImage', label: 'Хүүхдийн зураг (тунгалаг PNG)', type: 'image', maxSize: 900, aspect: 'aspect-square' },
    { name: 'visible', label: 'Сайт дээр харуулах', type: 'bool' },
  ],
  preview: (b) => (
    <div>
      <div className={`relative isolate h-28 overflow-hidden bg-gradient-to-br ${themeCls(branchThemes, b.theme)} p-4 text-white`}>
        <Thumb src={b.bgImage} className="absolute inset-0 -z-10 h-full w-full object-cover" />
        <span className="absolute inset-0 -z-10 bg-gradient-to-r from-black/45 to-transparent" />
        <Thumb src={b.kidsImage} className="absolute bottom-0 right-2 -z-10 h-[92%] w-auto object-contain" />
        <p className="text-xl font-black uppercase leading-none">{b.name}</p>
        {b.region && <p className="text-xl font-black uppercase leading-none">{b.region}</p>}
      </div>
      <div className="grid gap-1 p-4 text-sm text-ink-soft">
        {b.address && <p className="flex gap-1.5"><Icon name="pin" className="mt-0.5 h-4 w-4 shrink-0" />{b.address}</p>}
        {b.phone && <p className="flex gap-1.5 font-semibold text-ink"><Icon name="phone" className="mt-0.5 h-4 w-4 shrink-0" />{b.phone}</p>}
      </div>
    </div>
  ),
};

export const faqsConfig = {
  resource: 'faqs',
  title: 'Чат-ботын хариултууд',
  description: 'Хэрэглэгчийн бичсэн асуултад түлхүүр үг таарвал автоматаар хариулна. Эхний 3 асуулт чатын товч болж харагдана. Хөтөлбөр, салбар, утасны асуултад сайтын мэдээллээс автоматаар хариулдаг тул энд нэмэх шаардлагагүй.',
  addLabel: 'Асуулт нэмэх',
  defaults: { question: '', keywords: [], answer: '', collectLead: false, visible: true },
  fields: [
    { name: 'question', label: 'Асуулт', required: true, placeholder: 'Сургалтын төлбөр хэд вэ?', help: 'Чатын товч дээр ийм бичвэртэй харагдана.' },
    { name: 'keywords', label: 'Түлхүүр үгс', type: 'list', rows: 5, placeholder: 'төлбөр\nүнэ\nхэдэн төгрөг\ntulbur',
      help: 'Мөр бүрт нэг. Үгийн язгуурыг бичвэл илүү олон хэлбэрийг таньна (жишээ нь “бүртгүүл” → бүртгүүлэх, бүртгүүлмээр). Латинаар бичдэг хэлбэрийг ч нэмээрэй.' },
    { name: 'answer', label: 'Хариулт', type: 'textarea', rows: 5, required: true },
    { name: 'collectLead', label: 'Хариулсны дараа утасны дугаар үлдээхийг санал болгох', type: 'bool' },
    { name: 'visible', label: 'Идэвхтэй', type: 'bool' },
  ],
  preview: (f) => (
    <div className="grid gap-2 p-4">
      <p className="font-extrabold">{f.question}</p>
      <p className="line-clamp-3 whitespace-pre-line text-sm text-ink-soft">{f.answer}</p>
      <div className="flex flex-wrap gap-1">
        {f.keywords.slice(0, 6).map((k) => <span key={k} className="rounded-full bg-brand-mist px-2 py-0.5 text-[.7rem] font-bold text-brand-royal">{k}</span>)}
        {f.keywords.length > 6 && <span className="text-[.7rem] font-bold text-ink-soft">+{f.keywords.length - 6}</span>}
      </div>
      {f.collectLead && <p className="text-xs font-bold text-emerald-700">✓ Утас үлдээхийг санал болгоно</p>}
    </div>
  ),
};

export const rewardsConfig = {
  resource: 'rewards',
  title: 'MindPoint бэлэгнүүд',
  description: 'Эцэг эхчүүд цуглуулсан оноогоороо авах бэлэгнүүд. Үлдэгдлийг хоосон орхивол хязгааргүй. Олгосон бэлгийг “Бэлэг олголт” хэсгээс тэмдэглэнэ.',
  addLabel: 'Бэлэг нэмэх',
  defaults: { title: '', description: '', image: '', pointsCost: 100, stock: '', visible: true },
  fields: [
    { name: 'image', label: 'Зураг', type: 'image', maxSize: 900, aspect: 'aspect-[4/3]', help: 'Тунгалаг дэвсгэртэй PNG эсвэл цагаан дэвсгэртэй зураг хамгийн гоё харагдана.' },
    { name: 'title', label: 'Бэлгийн нэр', required: true, placeholder: 'MindEdu брэндийн цүнх' },
    { name: 'description', label: 'Тайлбар', type: 'textarea', rows: 2 },
    { name: 'pointsCost', label: 'Шаардлагатай оноо', inputType: 'number', placeholder: '150' },
    { name: 'stock', label: 'Үлдэгдэл (ширхэг)', inputType: 'number', placeholder: 'Хоосон = хязгааргүй', help: 'Хүн авах бүрт автоматаар хасагдана.' },
    { name: 'visible', label: 'Сайт дээр харуулах', type: 'bool' },
  ],
  preview: (r) => (
    <div className="flex gap-4 p-4">
      <div className="grid h-20 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-b from-[#F3F8FF] to-[#D9E9FF]">
        {r.image ? <Thumb src={r.image} className="h-full w-full object-contain p-1" /> : <Icon name="gift" className="h-8 w-8 text-brand-sky" />}
      </div>
      <div className="min-w-0">
        <p className="font-extrabold">{r.title}</p>
        <p className="mt-1 text-lg font-black text-brand-blue tabular-nums">{new Intl.NumberFormat('en-US').format(r.pointsCost)} оноо</p>
        <p className="text-xs font-semibold text-ink-soft">{r.stock === null ? 'Хязгааргүй' : r.stock === 0 ? 'Дууссан' : `Үлдэгдэл: ${r.stock}`}</p>
      </div>
    </div>
  ),
};
