import LandingHeader from "@/components/landing/LandingHeader";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import CTASection from "@/components/landing/CTASection";
import CaseStudiesSection from "@/components/landing/CaseStudiesSection";
import FAQSection from "@/components/landing/FAQSection";
import TeamSection from "@/components/landing/TeamSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import ContactSection from "@/components/landing/ContactSection";
import PricingSection from "@/components/landing/PricingSection";
import { Footer } from "@/components/layout/footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <LandingHeader />
      <main>
        <HeroSection />
        <FeaturesSection />
        <CTASection />
        <CaseStudiesSection />
        <FAQSection />
        <TeamSection />
        <TestimonialsSection />
        <ContactSection />
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
}
