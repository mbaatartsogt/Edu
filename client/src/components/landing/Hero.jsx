import { useContent } from '../../lib/content';
import MosaicHero from './hero/MosaicHero';
import FollowHero from './hero/FollowHero';
import LettersHero from './hero/LettersHero';

// Нүүр хэсгийн загварууд — админ → Холбоос, холбоо барих → "Нүүр хэсгийн загвар"-аас сонгоно
export const HERO_STYLES = { mosaic: MosaicHero, follow: FollowHero, letters: LettersHero };

export default function Hero() {
  const { settings, loading } = useContent();
  // Тохиргоо ирэх хүртэл хоосон зай (буруу загвар анивчихаас сэргийлнэ)
  if (loading) return <div aria-hidden="true" className="min-h-[clamp(560px,46vw,760px)] bg-white" />;
  const Comp = HERO_STYLES[settings.heroStyle] ?? MosaicHero;
  return <Comp />;
}
