// Баярын загварууд. Өнгө нь src/index.css доторх [data-season] хэсэгт.
export const seasons = {
  default: { label: 'Үндсэн (MindEdu)', cls: 'from-[#0A6CF5] to-[#F6C530]' },
  christmas: { label: 'Зул сар', cls: 'from-[#C8102E] via-[#10462D] to-[#F6C530]', greeting: 'Зул сарын баярын мэнд хүргэе!', sub: 'Шинэ оны ангиудад бүртгэл явагдаж байна' },
  newyear: { label: 'Шинэ жил', cls: 'from-[#4C34D6] via-[#120B3D] to-[#F6C530]', greeting: 'Шинэ оны мэнд хүргэе!', sub: 'Шинэ онд шинэ мэдлэг — англи хэлээ ахиулаарай' },
  tsagaansar: { label: 'Цагаан сар', cls: 'from-[#1565C0] via-white to-[#E0A800]', greeting: 'Сар шинэдээ сайхан шинэлээрэй!', sub: 'Цагаан сарын баярын мэнд хүргэе' },
  naadam: { label: 'Наадам', cls: 'from-[#DA2032] via-[#0066B3] to-[#FFD100]', greeting: 'Үндэсний их баяр наадмын мэнд хүргэе!', sub: 'Зуны эрчимжүүлсэн ангиуд нээгдлээ' },
};

export const weatherModes = [
  { value: 'auto', label: 'Автомат — Улаанбаатарын цаг агаараар' },
  { value: 'off', label: 'Унтраах' },
  { value: 'rain', label: 'Бороо (туршиж харах)' },
  { value: 'snow', label: 'Цас (туршиж харах)' },
  { value: 'wind', label: 'Салхи (туршиж харах)' },
];
