import LandingHeader from "@/components/landing/LandingHeader";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import { Footer } from "@/components/layout/footer";

export default function Home() {
  return (
    <>
      <LandingHeader />
      <div className="container mx-auto min-h-screen max-w-6xl">
        <div className="mx-4">
          <HeroSection />
          <FeaturesSection />
          <TestimonialsSection />
        </div>
        <Footer />
      </div>
    </>
  );
}
