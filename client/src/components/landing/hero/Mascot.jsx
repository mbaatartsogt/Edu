import { useEffect, useState } from 'react';
import { motion, useReducedMotion, useTransform } from 'framer-motion';

/**
 * MindEdu-гийн маскот хүүхэд (SVG). Толгой, нүд, хөмсөг нь курсорыг дагана.
 * x, y — −1…1 motion value, near — 0…1 (курсор ойртох тусам баярлана).
 * Нүүрний хэсгүүд толгойноос илүү хөдөлдөг тул эргэж харж буй мэт (pseudo-3D) харагдана.
 */
export default function Mascot({ x, y, near, onPoke, excited = false }) {
  const reduce = useReducedMotion();

  // Толгой: бага зэрэг эргэж, хазайна
  const headRot = useTransform(x, (v) => v * 9);
  const headX = useTransform(x, (v) => v * 9);
  const headY = useTransform(y, (v) => v * 6);
  // Нүүр (нүд, ам, хамар) толгойноос илүү шилжинэ → 3D эргэлт
  const faceX = useTransform(x, (v) => v * 13);
  const faceY = useTransform(y, (v) => v * 8);
  // Малгайн саравч эсрэг тал руу бага зэрэг
  const capX = useTransform(x, (v) => v * 6);
  // Хүүхэн хараа
  const pupilX = useTransform(x, (v) => v * 7);
  const pupilY = useTransform(y, (v) => v * 6);
  // Курсор ойртоход хөмсөг өргөгдөнө
  const browY = useTransform(near, (v) => -v * 7);
  // Бие бага зэрэг хазайна
  const bodyRot = useTransform(x, (v) => v * 2.5);
  const mouthD = useTransform(near, (v) => {
    const o = Math.min(1, v * 1.6);
    return `M178 216 Q200 ${222 + o * 20} 222 216 Q200 ${226 + o * 6} 178 216Z`;
  });

  // Нүд анивчих
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    if (reduce) return undefined;
    let t;
    const loop = () => {
      t = setTimeout(() => { setBlink(true); setTimeout(() => setBlink(false), 140); loop(); }, 2200 + Math.random() * 2800);
    };
    loop();
    return () => clearTimeout(t);
  }, [reduce]);

  const skin = '#F6CBA5', skinShade = '#E9B48A', hair = '#4A2E21', cap = '#0A6CF5', capDark = '#0848B8';
  const hoodie = '#F6C530', hoodieShade = '#E3AA12', pants = '#16336B';

  return (
    <motion.svg viewBox="0 0 400 560" className="h-full w-auto overflow-visible" role="img" aria-label="MindEdu-гийн маскот хүүхэд гараа даллаж байна"
      onClick={onPoke} style={{ cursor: onPoke ? 'pointer' : undefined }}>
      {/* Газрын сүүдэр */}
      <ellipse cx="200" cy="548" rx="120" ry="12" fill="#0B1D4A" opacity=".12" />

      <motion.g style={{ rotate: bodyRot, originX: '200px', originY: '540px' }}
        animate={excited ? { y: [0, -36, 0] } : { y: [0, -3, 0] }}
        transition={excited ? { duration: 0.55, ease: 'easeOut' } : { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}>

        {/* Хөл, гутал */}
        <rect x="148" y="430" width="46" height="100" rx="20" fill={pants} />
        <rect x="206" y="430" width="46" height="100" rx="20" fill={pants} />
        <path d="M136 528c0-14 12-22 30-22h20c8 0 12 6 12 14v10c0 6-4 10-10 10h-44c-5 0-8-5-8-12z" fill="#fff" />
        <path d="M264 528c0-14-12-22-30-22h-20c-8 0-12 6-12 14v10c0 6 4 10 10 10h44c5 0 8-5 8-12z" fill="#fff" />
        <path d="M136 532h62M202 532h62" stroke="#0A6CF5" strokeWidth="5" strokeLinecap="round" />

        {/* Цамц (hoodie) */}
        <path d="M128 282c18-14 46-20 72-20s54 6 72 20c16 12 22 34 24 58l8 98c1 14-10 24-24 24H120c-14 0-25-10-24-24l8-98c2-24 8-46 24-58z" fill={hoodie} />
        <path d="M112 380l-8 58c-1 14 10 24 24 24h144c14 0 25-10 24-24l-3-30c-40 22-120 22-181-28z" fill={hoodieShade} opacity=".45" />
        <path d="M150 400h100v26c0 8-6 14-14 14h-72c-8 0-14-6-14-14z" fill={hoodieShade} opacity=".6" />
        <path d="M176 276c4 18 12 26 24 26s20-8 24-26" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
        <path d="M188 300v34M212 300v34" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
        <circle cx="188" cy="338" r="4" fill="#fff" /><circle cx="212" cy="338" r="4" fill="#fff" />
        {/* Цээжний M тэмдэг */}
        <circle cx="244" cy="330" r="14" fill={cap} />
        <path d="M236 337v-13l8 8 8-8v13" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

        {/* Зүүн гар — ном барьсан */}
        <path d="M132 292c-22 20-34 58-30 98 2 14 10 20 22 20" fill="none" stroke={hoodie} strokeWidth="38" strokeLinecap="round" />
        <g transform="rotate(-10 150 392)">
          <rect x="112" y="354" width="86" height="64" rx="8" fill={capDark} />
          <rect x="116" y="358" width="78" height="56" rx="6" fill={cap} />
          <path d="M155 358v56" stroke={capDark} strokeWidth="3" />
          <text x="135" y="392" textAnchor="middle" fontSize="16" fontWeight="900" fill="#fff" fontFamily="system-ui, sans-serif">AB</text>
          <text x="175" y="392" textAnchor="middle" fontSize="16" fontWeight="900" fill="#F6C530" fontFamily="system-ui, sans-serif">C</text>
        </g>
        <circle cx="122" cy="404" r="15" fill={skin} />

        {/* Баруун гар — даллаж байна */}
        <motion.g style={{ originX: '268px', originY: '292px' }}
          animate={reduce ? undefined : { rotate: [0, -16, 6, -16, 0, 0] }}
          transition={{ duration: 2.4, times: [0, 0.15, 0.3, 0.45, 0.6, 1], repeat: Infinity, repeatDelay: 1.6, ease: 'easeInOut' }}>
          <path d="M268 292c26-6 48-40 56-86" fill="none" stroke={hoodie} strokeWidth="38" strokeLinecap="round" />
          <g transform="translate(326 176)">
            <rect x="-17" y="-8" width="34" height="38" rx="14" fill={skin} />
            {[-13, -4, 5, 14].map((fx, i) => <rect key={i} x={fx - 4} y={-34 + Math.abs(i - 1.5) * 4} width="8.5" height="34" rx="4.25" fill={skin} />)}
            <rect x="-28" y="2" width="9" height="24" rx="4.5" fill={skin} transform="rotate(-38 -24 14)" />
          </g>
        </motion.g>

        {/* Хүзүү */}
        <rect x="182" y="238" width="36" height="36" rx="12" fill={skinShade} />

        {/* Толгой */}
        <motion.g style={{ x: headX, y: headY, rotate: headRot, originX: '200px', originY: '250px' }}>
          {/* Чих */}
          <circle cx="128" cy="178" r="17" fill={skin} /><circle cx="128" cy="178" r="8" fill={skinShade} />
          <circle cx="272" cy="178" r="17" fill={skin} /><circle cx="272" cy="178" r="8" fill={skinShade} />
          {/* Нүүр */}
          <ellipse cx="200" cy="172" rx="74" ry="76" fill={skin} />
          {/* Үс (малгайн доороос) */}
          <path d="M128 150c4-26 20-44 40-50 18 10 42 14 66 10 22 8 36 22 40 42-16-10-30-12-44-8-30-12-66-12-102 6z" fill={hair} />
          <path d="M132 168c-6-10-6-22-2-30 6 6 10 14 12 26z" fill={hair} />
          <path d="M268 168c6-10 6-22 2-30-6 6-10 14-12 26z" fill={hair} />

          {/* Нүүрний хэсгүүд — илүү шилжинэ */}
          <motion.g style={{ x: faceX, y: faceY }}>
            {/* Хөмсөг */}
            <motion.g style={{ y: browY }}>
              <path d="M156 152c8-6 20-7 28-2" fill="none" stroke={hair} strokeWidth="6" strokeLinecap="round" />
              <path d="M216 150c8-5 20-4 28 2" fill="none" stroke={hair} strokeWidth="6" strokeLinecap="round" />
            </motion.g>
            {/* Нүд */}
            {[172, 228].map((ex) => (
              <g key={ex}>
                <ellipse cx={ex} cy="178" rx="16" ry="19" fill="#fff" />
                <motion.g style={{ x: pupilX, y: pupilY }}>
                  <circle cx={ex} cy="180" r="9.5" fill="#1B2440" />
                  <circle cx={ex + 3.5} cy="176" r="3.2" fill="#fff" />
                </motion.g>
                <motion.rect x={ex - 18} y="157" width="36" height="42" rx="16" fill={skin}
                  initial={false} animate={{ scaleY: blink ? 1 : 0 }} style={{ originY: '157px' }} transition={{ duration: 0.07 }} />
              </g>
            ))}
            {/* Хацар */}
            <ellipse cx="150" cy="208" rx="14" ry="8" fill="#FF8A8A" opacity=".45" />
            <ellipse cx="250" cy="208" rx="14" ry="8" fill="#FF8A8A" opacity=".45" />
            {/* Хамар */}
            <path d="M198 194c-4 6-4 10 2 11" fill="none" stroke={skinShade} strokeWidth="4" strokeLinecap="round" />
            {/* Ам: курсор ойртоход нээгдэнэ */}
            <motion.path fill="#8A2E2E" stroke="#8A2E2E" strokeWidth="2" strokeLinejoin="round"
              style={{ d: mouthD }} />
          </motion.g>

          {/* Малгай */}
          <path d="M122 132c4-44 38-72 78-72s74 28 78 72c-48-14-108-14-156 0z" fill={cap} />
          <path d="M122 132c48-14 108-14 156 0l-2 10c-48-12-104-12-152 0z" fill={capDark} />
          <circle cx="200" cy="64" r="7" fill={capDark} />
          <motion.g style={{ x: capX }}>
            <path d="M150 138c26-9 74-9 100 0 14 5 26 12 34 22-30-7-58-10-84-10s-54 3-84 10c8-10 20-17 34-22z" fill={capDark} />
          </motion.g>
          <motion.g style={{ x: faceX }}>
            <circle cx="200" cy="104" r="17" fill="#F6C530" />
            <path d="M191 111v-14l9 9 9-9v14" fill="none" stroke={capDark} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
          </motion.g>
        </motion.g>
      </motion.g>
    </motion.svg>
  );
}
