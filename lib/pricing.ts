import "server-only";

import { configured, supabase } from "@/lib/supabase";

export type PricingPlanType = "self" | "standard" | "advanced";

export type PublicPricingPlan = {
  id: string;
  planId: string;
  name: string;
  type: PricingPlanType;
  subjectsCount: number;
  monthlyPriceMinor: number;
  currency: string;
  included: string[];
  excluded: string[];
};

export type DurationDiscount = { months: 1 | 3 | 6 | 12; percent: number };
export type PricingCatalog = { plans: PublicPricingPlan[]; discounts: DurationDiscount[] };

function stringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.length > 0) : [];
}

export async function getPricingCatalog(): Promise<PricingCatalog> {
  if (!configured()) return { plans: [], discounts: [] };
  try {
    const db = await supabase();
    const [pricingResult, discountResult] = await Promise.all([
      db.from("pricing_plans")
        .select("id,plan_id,name,type,subjects_count,monthly_price_minor,features,plans(currency)")
        .eq("active", true)
        .order("type")
        .order("subjects_count"),
      db.from("pricing_duration_discounts")
        .select("duration_months,discount_percent")
        .eq("active", true)
        .order("duration_months"),
    ]);
    if (pricingResult.error || discountResult.error || pricingResult.data?.length !== 12 || discountResult.data?.length !== 4) return { plans: [], discounts: [] };
    type PriceRow = {
      id: string; plan_id: string; name: string; type: PricingPlanType; subjects_count: number;
      monthly_price_minor: number; features: { included?: unknown; excluded?: unknown } | null;
      plans: { currency: string } | { currency: string }[] | null;
    };
    const plans = (pricingResult.data as unknown as PriceRow[]).map((row) => {
      const parent = Array.isArray(row.plans) ? row.plans[0] : row.plans;
      return {
        id: row.id,
        planId: row.plan_id,
        name: row.name,
        type: row.type,
        subjectsCount: row.subjects_count,
        monthlyPriceMinor: row.monthly_price_minor,
        currency: parent?.currency ?? "RUB",
        included: stringList(row.features?.included),
        excluded: stringList(row.features?.excluded),
      };
    });
    const discounts = (discountResult.data ?? []).flatMap((row) =>
      [1, 3, 6, 12].includes(row.duration_months)
        ? [{ months: row.duration_months as DurationDiscount["months"], percent: row.discount_percent }]
        : [],
    );
    return { plans, discounts };
  } catch {
    return { plans: [], discounts: [] };
  }
}
