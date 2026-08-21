import { configured, supabase } from "@/lib/supabase";

export type PublicPlan = { code: string; name: string; priceLabel: string | null; pricesMinor: Record<number, number>; currency: string; features: string[]; maxSubjects: number };

const fallbackPlans: PublicPlan[] = [
  { code: "basic", name: "Самостоятельный", priceLabel: null, pricesMinor: {}, currency: "RUB", maxSubjects: 4, features: ["Банк заданий", "Пробники", "Материалы", "Прогресс подготовки"] },
  { code: "curator", name: "Стандарт", priceLabel: null, pricesMinor: {}, currency: "RUB", maxSubjects: 4, features: ["Занятия и записи", "Проверка домашних заданий", "Кабинет родителя", "Аналитика прогресса"] },
  { code: "maximum", name: "Продвинутый", priceLabel: null, pricesMinor: {}, currency: "RUB", maxSubjects: 4, features: ["Всё из Стандарта", "Персональный маршрут", "AI-анализ ошибок", "Адаптивные задания"] },
];

const labels: Record<string, string> = {
  lessons: "Живые занятия", recordings: "Записи занятий", materials: "Учебные материалы",
  assignments: "Домашние задания", mock_exams: "Пробники", curator: "Личный куратор",
  parent_reports: "Отчёты родителю", individual_plan: "Индивидуальный учебный план",
  admission_support: "Помощь с поступлением", career_guidance: "Профориентация",
  question_bank: "Банк заданий", student_dashboard: "Личный кабинет ученика", progress: "Прогресс подготовки",
  homework_review: "Проверка домашних заданий", analytics: "Аналитика прогресса", mini_groups: "Мини-группы",
  ai_error_analysis: "AI-анализ ошибок", adaptive_assignments: "Адаптивные задания", psychological_support: "Психологическая поддержка",
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
      .select("code,name,base_price_minor,currency,plan_features(feature_code,enabled,limit_value),plan_subject_limits(max_subjects),pricing_plans(subjects_count,monthly_price_minor,active)")
      .eq("active", true).order("base_price_minor");
    if (error || !data?.length) return fallbackPlans;
    type Feature = { feature_code: string; enabled: boolean; limit_value: number | null };
    type Limit = { max_subjects: number };
    type Price = { subjects_count: number; monthly_price_minor: number; active: boolean };
    type Row = { code: string; name: string; base_price_minor: number; currency: string; plan_features: Feature[] | null; plan_subject_limits: Limit | Limit[] | null; pricing_plans: Price[] | null };
    return (data as unknown as Row[]).map((row) => {
      const rawLimit = Array.isArray(row.plan_subject_limits) ? row.plan_subject_limits[0] : row.plan_subject_limits;
      const features = (row.plan_features ?? []).filter((feature) => feature.enabled).map((feature) => {
        if (feature.feature_code === "mock_exams" && feature.limit_value) return `${feature.limit_value} пробника в месяц`;
        if (feature.feature_code === "parent_reports" && feature.limit_value) return `До ${feature.limit_value} отчётов родителю`;
        return labels[feature.feature_code] ?? feature.feature_code;
      });
      if (rawLimit?.max_subjects) features.unshift(`До ${rawLimit.max_subjects} предметов`);
      const pricesMinor = Object.fromEntries((row.pricing_plans ?? []).filter((price) => price.active).map((price) => [price.subjects_count, price.monthly_price_minor]));
      const oneSubjectPrice = pricesMinor[1];
      return { code: row.code, name: row.name, priceLabel: oneSubjectPrice ? priceLabel(oneSubjectPrice, row.currency) : null, pricesMinor, currency: row.currency, maxSubjects: rawLimit?.max_subjects ?? 1, features: features.slice(0, 6) };
    });
  } catch {
    return fallbackPlans;
  }
}
