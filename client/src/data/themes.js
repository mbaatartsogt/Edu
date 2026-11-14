// Админ панелаас сонгох өнгөний загварууд.
// Шинэ өнгө нэмбэл server/content.js доторх PROGRAM_THEMES / BRANCH_THEMES-д мөн нэмнэ.

export const programThemes = {
  sky: { label: 'Цайвар цэнхэр', cls: 'from-brand-sky to-brand-blue' },
  blue: { label: 'Цэнхэр', cls: 'from-brand-blue to-brand-royal' },
  royal: { label: 'Гүн цэнхэр', cls: 'from-brand-royal to-brand-navy' },
  coral: { label: 'Шүрэн улаан', cls: 'from-[#FF8A6B] to-[#E5402B]' },
  mint: { label: 'Ногоон', cls: 'from-[#3FCF9F] to-[#178A68]' },
};

export const branchThemes = {
  blue: { label: 'Цэнхэр', cls: 'from-brand-royal via-brand-blue to-brand-sky' },
  sky: { label: 'Тэнгэр', cls: 'from-[#2F78CF] via-[#62A0E6] to-[#A8CCF2]' },
  sand: { label: 'Говь', cls: 'from-[#9C7E3C] via-[#C4A764] to-[#E3D09C]' },
  olive: { label: 'Хангай', cls: 'from-[#5E6B4C] via-[#9C9058] to-[#D8C077]' },
  dusk: { label: 'Үдэш', cls: 'from-[#4F5F86] via-[#957A98] to-[#D597A6]' },
};

export const themeCls = (map, key) => (map[key] ?? Object.values(map)[0]).cls;
