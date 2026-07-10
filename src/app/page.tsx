import { redirect } from 'next/navigation';
import { Navbar } from '@/components/landing/Navbar';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { BentoSection } from '@/components/landing/BentoSection';
import { AiAssistantSection } from '@/components/landing/AiAssistantSection';
import { CoachOpsSection } from '@/components/landing/CoachOpsSection';
import { RoadmapSection } from '@/components/landing/RoadmapSection';
import { FAQSection } from '@/components/landing/FAQSection';
import { CTASection } from '@/components/landing/CTASection';
import { WishlistSection } from '@/components/landing/WishlistSection';
import { Footer } from '@/components/landing/Footer';
import { StructuredData } from '@/components/landing/StructuredData';
import { getServerUser } from '@/features/auth/services/auth.server';

export default async function LandingPage() {
  const user = await getServerUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-endurix-paper dark:bg-background">
      <StructuredData />
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <BentoSection />
        <AiAssistantSection />
        <CoachOpsSection />
        <RoadmapSection />
        <FAQSection />
        <CTASection />
        <WishlistSection />
      </main>
      <Footer />
    </div>
  );
}
