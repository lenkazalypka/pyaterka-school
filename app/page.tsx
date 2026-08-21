import { PublicFooter } from "@/components/public/footer";
import { PublicHeader } from "@/components/public/header";
import { PublicHero } from "@/components/public/hero";
import { RoutePlanner } from "@/components/public/route-planner";
import { PublicSections } from "@/components/public/sections";
import { getPublicPlans } from "@/lib/public-site";
import { leadCaptureEnabled } from "@/lib/leads";

export default async function Home() {
  const plans = await getPublicPlans();

  return (
    <main className="public-page">
      <PublicHeader />
      <PublicHero />
      <RoutePlanner enabled={leadCaptureEnabled()} />
      <PublicSections plans={plans} />
      <PublicFooter />
    </main>
  );
}
