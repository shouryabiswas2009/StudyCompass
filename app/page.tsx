import { Hero } from "@/components/landing/hero";
import { FeatureCards } from "@/components/landing/feature-cards";
import { CtaSection } from "@/components/landing/cta-section";

export default function Home() {
  return (
    <>
      <Hero />
      <FeatureCards />
      <CtaSection />
    </>
  );
}
