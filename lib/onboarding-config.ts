export const onboardingSteps = [
  { slug: "profile", title: "Профиль" },
  { slug: "exam", title: "Направление" },
  { slug: "subjects", title: "Предметы" },
  { slug: "goals", title: "Поступление" },
  { slug: "schedule", title: "Режим" },
  { slug: "parent", title: "Родитель" },
  { slug: "plan", title: "Тариф" },
  { slug: "review", title: "Проверка" },
] as const;

export type OnboardingSlug = (typeof onboardingSteps)[number]["slug"];

export const contactMethods = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Телефон" },
  { value: "messenger", label: "Мессенджер" },
] as const;

export const supportedTimezones = [
  { value: "Europe/Kaliningrad", label: "Калининград, UTC+2" },
  { value: "Europe/Moscow", label: "Москва, UTC+3" },
  { value: "Europe/Samara", label: "Самара, UTC+4" },
  { value: "Asia/Yekaterinburg", label: "Екатеринбург, UTC+5" },
  { value: "Asia/Omsk", label: "Омск, UTC+6" },
  { value: "Asia/Krasnoyarsk", label: "Красноярск, UTC+7" },
  { value: "Asia/Irkutsk", label: "Иркутск, UTC+8" },
  { value: "Asia/Yakutsk", label: "Якутск, UTC+9" },
  { value: "Asia/Vladivostok", label: "Владивосток, UTC+10" },
  { value: "Asia/Magadan", label: "Магадан, UTC+11" },
  { value: "Asia/Kamchatka", label: "Камчатка, UTC+12" },
] as const;

export const weekdays = [
  { value: 1, label: "Пн" }, { value: 2, label: "Вт" },
  { value: 3, label: "Ср" }, { value: 4, label: "Чт" },
  { value: 5, label: "Пт" }, { value: 6, label: "Сб" },
  { value: 7, label: "Вс" },
] as const;

export function stepPath(step: number) {
  const safe = Math.min(8, Math.max(1, step));
  return `/onboarding/${onboardingSteps[safe - 1].slug}`;
}

export function isOnboardingSlug(value: string): value is OnboardingSlug {
  return onboardingSteps.some((step) => step.slug === value);
}

export function stepNumber(slug: OnboardingSlug) {
  return onboardingSteps.findIndex((step) => step.slug === slug) + 1;
}

