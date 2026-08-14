import { PublicFooter } from "@/components/public/footer";
import { PublicHeader } from "@/components/public/header";
import { PublicHero } from "@/components/public/hero";
import { ScoreComparison } from "@/components/public/score-comparison";
import { ScrollReveal } from "@/components/public/scroll-reveal";
import { PublicSections } from "@/components/public/sections";
import { getPublicPlans } from "@/lib/public-site";

export default async function Home() {
  const plans = await getPublicPlans();

  return (
    <main className="public-page public-v2">
      <PublicHeader />
      <PublicHero />
      <ScoreComparison />
      <PublicSections plans={plans} />
      <PublicFooter />
      <ScrollReveal />
    </main>
  );
}
