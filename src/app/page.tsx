import { Navbar } from '@/components/landing/Navbar';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { ProductFeaturesSection } from '@/components/landing/ProductFeaturesSection';
import { RoadmapSection } from '@/components/landing/RoadmapSection';
import { CTASection } from '@/components/landing/CTASection';
import { Footer } from '@/components/landing/Footer';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-dark-navy">
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <ProductFeaturesSection />
        <RoadmapSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
