import { redirect } from 'next/navigation';
import { Navbar } from '@/components/landing/Navbar';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { ProductFeaturesSection } from '@/components/landing/ProductFeaturesSection';
import { CoachOpsSection } from '@/components/landing/CoachOpsSection';
import { RoadmapSection } from '@/components/landing/RoadmapSection';
import { CTASection } from '@/components/landing/CTASection';
import { WishlistSection } from '@/components/landing/WishlistSection';
import { Footer } from '@/components/landing/Footer';
import { getServerUser } from '@/features/auth/services/auth.server';

export default async function LandingPage() {
  const user = await getServerUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-endurix-paper dark:bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <ProductFeaturesSection />
        <CoachOpsSection />
        <RoadmapSection />
        <CTASection />
        <WishlistSection />
      </main>
      <Footer />
    </div>
  );
}
