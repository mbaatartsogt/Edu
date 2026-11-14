// Анх асахад хүснэгт хоосон бол оруулах жишээ контент.
// Дараа нь бүгдийг админ панелаас засна.

const OFFICE_ADDRESS = 'Улаанбаатар хот, Сүхбаатар дүүрэг, 8-р хороо, Болгарын гудамж, Монголын архитекторуудын эвлэл, 6 давхар, 602 тоот';

// MindEdu-гийн Facebook хуудасны мэдээллээс
export const seedSettings = {
  heroStyle: 'mosaic',
  facebook: 'https://www.facebook.com/',
  instagram: 'https://www.instagram.com/mindedu.mn/',
  threads: 'https://www.threads.net/@mindedu.mn',
  messenger: '',
  phone: '9119-1971',
  email: 'manager@mindedu.mn',
  hours: 'Даваа–Бямба · 10:00–20:00',
  address: OFFICE_ADDRESS,
  mapUrl: 'https://maps.google.com/?q=Монголын+архитекторуудын+эвлэл,+Болгарын+гудамж,+Улаанбаатар',
  pointsPer1000: '1',
  seasonTheme: 'default',
  weatherMode: 'auto',
  pointsSignup: '50',
  chatGreeting: 'Сайн байна уу! MindEdu-гийн туслах байна. Хөтөлбөр, төлбөр, салбарын талаар асуух юм уу эсвэл доорх сэдвээс сонгоорой.',
};

// Өмнөх хувилбарын жишээ утгууд. Админ өөрчлөөгүй (жишээ утгаараа үлдсэн) бол шинэ утгаар солино.
export const previousSeedSettings = [
  { instagram: 'https://www.instagram.com/', threads: 'https://www.threads.net/', email: 'info@mindedu.mn',
    address: 'Дрийм Апартмент 94Б-101, Баянзүрх дүүрэг, 5-р хороо, Улаанбаатар хот', mapUrl: 'https://maps.google.com/?q=Ulaanbaatar' },
];

export const seed = {
  // Жишээ бэлэгнүүд — админ → MindPoint бэлэгнүүд хэсэгт бодит бэлгээ оруулна
  rewards: [
    { title: 'MindEdu брэндийн цүнх', description: 'MindEdu лого бүхий хичээлийн цүнх.', pointsCost: 150, stock: 20 },
    { title: 'Англи хэлний зурагт толь', description: 'Хүүхдэд зориулсан өнгөт зурагтай англи-монгол толь бичиг.', pointsCost: 200, stock: 15 },
    { title: 'Ярианы клубын 1 сарын эрх', description: 'Native багштай долоо хоногт 1 удаагийн ярианы клуб.', pointsCost: 400, stock: null },
    { title: 'Дараагийн сарын төлбөрт 20% хөнгөлөлт', description: 'Дараагийн сарын сургалтын төлбөрөөс 20% хасагдана.', pointsCost: 500, stock: null },
    { title: 'Утасгүй чихэвч', description: 'Сонсголын дасгал, онлайн хичээлд тохиромжтой bluetooth чихэвч.', pointsCost: 1200, stock: 5 },
    { title: 'Таблет', description: 'Цахим ном, англи хэлний апп ашиглахад зориулсан 10 инчийн таблет.', pointsCost: 4000, stock: 2 },
  ],
  faqs: [
    { question: 'Сургалтын төлбөр хэд вэ?', keywords: ['төлбөр', 'үнэ', 'хэдэн төгрөг', 'мөнгө', 'хямдрал', 'price', 'tulbur', 'une', 'mungu'],
      answer: 'Сургалтын төлбөр хөтөлбөр болон хуваариас хамаарна. Утасны дугаараа үлдээвэл манай ажилтан танд дэлгэрэнгүй мэдээлэл өгнө.', collectLead: true },
    { question: 'Хичээл хэзээ эхлэх вэ?', keywords: ['эхлэх', 'хэзээ', 'огноо', 'эхэлнэ', 'start', 'ehleh', 'hezee', 'ehelne'],
      answer: 'Намрын ангиуд 9-р сарын 14-нөөс эхэлнэ. Долоо хоногт 3 удаа, нэг хичээл 90 минут үргэлжилнэ.' },
    { question: 'Нэг ангид хэдэн хүүхэд суудаг вэ?', keywords: ['хэдэн хүүхэд', 'ангид', 'дүүргэлт', 'анги дүүргэх', 'heden huuhed', 'angid'],
      answer: 'Нэг ангид 15-аас илүүгүй хүүхэд суудаг. Тиймээс багш хүүхэд бүртэй ажиллах цаг гардаг.' },
    { question: 'Ямар насны хүүхэд суралцах боломжтой вэ?', keywords: ['нас', 'настай', 'хэдэн настай', 'бага насны', 'өсвөр', 'nas', 'nastai'],
      answer: '8-аас 18 насны хүүхэд, өсвөр үеийнхэн суралцана. 8–11, 12–14, 15–18 насны гэсэн 3 бүлэгтэй.' },
    { question: 'Түвшин тогтоох шалгалт байдаг уу?', keywords: ['түвшин', 'шалгалт', 'тест', 'level', 'tuvshin', 'shalgalt', 'test'],
      answer: 'Тийм. Элсэхээс өмнө хүүхдийн түвшинг үнэ төлбөргүй тогтоож, тохирох бүлэгт оруулна.' },
  ],
  programs: [
    { age: '8–11', title: 'Young Explorers', level: 'Starter → A1', theme: 'sky',
      goals: ['Үг цээжлэх, авиа зөв дуудах', 'Тоглоом, дуугаар ярианы дадал суулгах', 'Энгийн өгүүлбэр уншиж, бичих'],
      days: 'Даваа · Лхагва · Баасан', classTime: '15:00–16:30 эсвэл 17:00–18:30', price: 0, priceLabel: '/ сар' },
    { age: '12–14', title: 'Teen Builders', level: 'A2 → B1', theme: 'blue',
      goals: ['Дүрмийн суурийг бэхжүүлэх', 'Сэдэвчилсэн яриа, илтгэл тавих', 'Сонсгол, уншлагын ойлголт сайжруулах'],
      days: 'Мягмар · Пүрэв · Бямба', classTime: '17:00–18:30 (Бя: 10:00–11:30)', price: 0, priceLabel: '/ сар' },
    { age: '15–18', title: 'Future Leaders', level: 'B1 → B2 / IELTS', theme: 'royal',
      goals: ['Академик бичвэр, эссэ бичих', 'Мэтгэлцээн, нийтийн өмнө ярих', 'IELTS-д бэлтгэх стратеги'],
      days: 'Даваа · Лхагва · Баасан', classTime: '18:45–20:15', price: 0, priceLabel: '/ сар' },
  ],
  teachers: [
    { name: 'Б. Номин', role: 'Ахлах багш · 8–11 нас', bio: 'Бага насны хүүхдэд тоглоомоор хичээл заах 8 жилийн туршлагатай.', badges: ['CELTA', '8 жил'], photo: '/images/teacher-1.jpg' },
    { name: 'Г. Тэмүүлэн', role: 'Багш · 12–14 нас', bio: 'Дүрэм, яриаг хослуулсан сэдэвчилсэн хичээлээрээ сурагчдын дунд алдартай.', badges: ['TESOL', '6 жил'], photo: '/images/teacher-2.jpg' },
    { name: 'Emily Carter', role: 'Native speaker · Ярианы клуб', bio: 'Их Британиас ирсэн багш. Ярианы клуб, дуудлагын хичээлийг хариуцна.', badges: ['CELTA', 'UK'], photo: '/images/teacher-3.jpg' },
    { name: 'Д. Сараа', role: 'IELTS багш · 15–18 нас', bio: 'IELTS 8.0 оноотой. Ахлах ангийнхныг гадаадад суралцахад бэлддэг.', badges: ['IELTS 8.0', '5 жил'], photo: '/images/teacher-4.jpg' },
  ],
  branches: [
    { name: 'Dream', region: 'Ulaanbaatar', theme: 'dusk', phone: '9119-1971',
      address: 'Дрийм Апартмент 94Б-101, Баянзүрх дүүрэг, 5-р хороо, Улаанбаатар хот',
      bgImage: '/images/branches/ulaanbaatar-bg.jpg', kidsImage: '/images/branches/ulaanbaatar-kids.png' },
    { name: 'Darkhan', region: 'City', theme: 'sky', phone: '9119-1971',
      address: 'Дархан-Уул аймаг, Дархан хот, Энх оршихуй төв 2 давхар',
      bgImage: '/images/branches/darkhan-bg.jpg', kidsImage: '/images/branches/darkhan-kids.png' },
    { name: 'Arvaikheer', region: 'Uvurkhangai', theme: 'olive', phone: '9119-1971',
      address: 'Өвөрхангай аймаг, Арвайхээр сум, Титэм хотхон 1 давхар төв',
      bgImage: '/images/branches/arvaikheer-bg.jpg', kidsImage: '/images/branches/arvaikheer-kids.png' },
    { name: 'Choir', region: 'Govisumber', theme: 'sand', phone: '9119-1971',
      address: 'Говьсүмбэр аймаг, 3-р баг, Найрамдал хотхон, 6-р байр, 4-р орц, 61 тоот',
      bgImage: '/images/branches/choir-bg.jpg', kidsImage: '/images/branches/choir-kids.png' },
  ],
};
