import { PublicFooter } from "@/components/public/footer";
import { PublicHeader } from "@/components/public/header";
import { PublicHero } from "@/components/public/hero";
import { PublicSections } from "@/components/public/sections";
import { getPublicPlans } from "@/lib/public-site";

export default async function Home() {
  const plans = await getPublicPlans();

  return (
    <main className="public-page">
      <PublicHeader />
      <PublicHero />
      <PublicSections plans={plans} />
      <PublicFooter />
    </main>
  );
}
