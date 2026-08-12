import { configured, supabase } from "@/lib/supabase";

export type PublicPlan = { code: string; name: string; priceLabel: string | null; features: string[]; maxSubjects: number };

const fallbackPlans: PublicPlan[] = [
  { code: "basic", name: "Базовый", priceLabel: null, maxSubjects: 2, features: ["Живые занятия и записи", "Материалы и домашние задания", "Два пробника в месяц", "Базовая статистика"] },
  { code: "curator", name: "С куратором", priceLabel: null, maxSubjects: 3, features: ["Всё из Базового", "Личный куратор", "Контроль дедлайнов", "Отчёты родителю"] },
  { code: "maximum", name: "Максимальный", priceLabel: null, maxSubjects: 4, features: ["Всё из пакета с куратором", "Индивидуальный учебный план", "Дополнительные разборы", "Помощь с поступлением"] },
];

const labels: Record<string, string> = {
  lessons: "Живые занятия", recordings: "Записи занятий", materials: "Учебные материалы",
  assignments: "Домашние задания", mock_exams: "Пробники", curator: "Личный куратор",
  parent_reports: "Отчёты родителю", individual_plan: "Индивидуальный учебный план",
  admission_support: "Помощь с поступлением", career_guidance: "Профориентация",
};

function priceLabel(priceMinor: number, currency: string) {
  const value = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(priceMinor / 100);
  return currency === "RUB" ? `от ${value} ₽/мес` : `от ${value} ${currency}/мес`;
}

export async function getPublicPlans(): Promise<PublicPlan[]> {
  if (!configured()) return fallbackPlans;
  try {
    const db = await supabase();
    const { data, error } = await db.from("plans")
      .select("code,name,base_price_minor,currency,plan_features(feature_code,enabled,limit_value),plan_subject_limits(max_subjects)")
      .eq("active", true).order("base_price_minor");
    if (error || !data?.length) return fallbackPlans;
    type Feature = { feature_code: string; enabled: boolean; limit_value: number | null };
    type Limit = { max_subjects: number };
    type Row = { code: string; name: string; base_price_minor: number; currency: string; plan_features: Feature[] | null; plan_subject_limits: Limit | Limit[] | null };
    return (data as unknown as Row[]).map((row) => {
      const rawLimit = Array.isArray(row.plan_subject_limits) ? row.plan_subject_limits[0] : row.plan_subject_limits;
      const features = (row.plan_features ?? []).filter((feature) => feature.enabled).map((feature) => {
        if (feature.feature_code === "mock_exams" && feature.limit_value) return `${feature.limit_value} пробника в месяц`;
        if (feature.feature_code === "parent_reports" && feature.limit_value) return `До ${feature.limit_value} отчётов родителю`;
        return labels[feature.feature_code] ?? feature.feature_code;
      });
      if (rawLimit?.max_subjects) features.unshift(`До ${rawLimit.max_subjects} предметов`);
      return { code: row.code, name: row.name, priceLabel: priceLabel(row.base_price_minor, row.currency), maxSubjects: rawLimit?.max_subjects ?? 1, features: features.slice(0, 6) };
    });
  } catch {
    return fallbackPlans;
  }
}
