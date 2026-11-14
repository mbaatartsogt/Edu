import Header from '../components/landing/Header';
import Hero from '../components/landing/Hero';
import TodoSection from '../components/landing/TodoSection';
import Programs from '../components/landing/Programs';
import Benefits from '../components/landing/Benefits';
import Teachers from '../components/landing/Teachers';
import Testimonials from '../components/landing/Testimonials';
import LearnLive from '../components/landing/LearnLive';
import Branches from '../components/landing/Branches';
import { ContentProvider } from '../lib/content';
import ChatWidget from '../components/chat/ChatWidget';
import WeatherEffects from '../components/effects/WeatherEffects';
import { SeasonBanner, SeasonTheme } from '../components/effects/Season';
import HowToJoin from '../components/landing/HowToJoin';
import Footer from '../components/landing/Footer';
import { ScrollProgress } from '../components/ui/motion';

export default function Landing() {
  return (
    <ContentProvider>
      <ScrollProgress />
      <a href="#top" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-full focus:bg-white focus:px-4 focus:py-2">
        Үндсэн агуулга руу шилжих
      </a>
      <SeasonTheme />
      <SeasonBanner />
      <Header />
      <main id="top">
        <Hero />
        <TodoSection />
        <LearnLive />
        <Programs />
        <Benefits />
        <Teachers />
        <Testimonials />
        <Branches />
        <HowToJoin />
      </main>
      <Footer />
      <ChatWidget />
      <WeatherEffects />
    </ContentProvider>
  );
}
