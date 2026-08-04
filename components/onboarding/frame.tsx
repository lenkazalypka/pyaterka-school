import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Brand } from "@/components/brand";
import { onboardingSteps, stepPath } from "@/lib/onboarding-config";

export function OnboardingFrame({ step, children }: { step: number; children: React.ReactNode }) {
  const current = onboardingSteps[step - 1];
  return <main className="onboarding-screen">
    <div className="onboarding-shell">
      <header className="onboarding-header"><Brand inverse/><span className="onboarding-step-label">Шаг {step} из 8</span></header>
      <div className="onboarding-progress" aria-label={`Шаг ${step} из 8`}>
        {onboardingSteps.map((item, index) => <span key={item.slug} className={index < step ? "is-done" : ""}/>) }
      </div>
      <section className="onboarding-card">
        {step > 1 && <Link href={stepPath(step - 1)} className="onboarding-back"><ChevronLeft/>Назад</Link>}
        <p className="onboarding-title">{current.title}</p>
        {children}
      </section>
      <p className="onboarding-note">Сохраняем данные после каждого шага. До завершения можно вернуться и всё исправить.</p>
    </div>
  </main>;
}
