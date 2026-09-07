import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import {
  LandingNav,
  Hero,
  Features,
  HowItWorks,
  Faq,
  FinalCta,
  LandingFooter,
} from "@/components/landing/sections";

export const metadata: Metadata = {
  title: `${BRAND.name} — your personal media catalog`,
  description:
    "Everything you've read, watched, and played — books, movies, TV, and games — on one private shelf. Track, rate, and rediscover it all.",
};

/** The public landing page. Signed-in visitors are sent to the app by the middleware. */
export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-bg">
      <LandingNav />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Faq />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
