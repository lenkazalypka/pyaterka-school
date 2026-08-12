import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Brand } from "@/components/brand";
import { StartWizard } from "@/components/public/start-wizard";
import { getPublicPlans } from "@/lib/public-site";

export const metadata: Metadata = {
  title: "Собрать план подготовки",
  description: "Выберите экзамен, предметы и тариф до регистрации и оплаты.",
};

type StartParams = { exam?: string; grade?: string; subject?: string; plan?: string };

export default async function StartPage({ searchParams }: { searchParams: Promise<StartParams> }) {
  const [plans, params] = await Promise.all([getPublicPlans(), searchParams]);

  return (
    <main className="start-page">
      <header className="start-header">
        <div className="public-container start-header-inner">
          <Brand />
          <div>
            <Link className="start-back-link" href="/"><ArrowLeft aria-hidden="true" /> На главную</Link>
            <Link className="start-login-link" href="/login">Войти</Link>
          </div>
        </div>
      </header>
      <StartWizard
        plans={plans}
        initialExam={params.exam}
        initialGrade={params.grade}
        initialSubject={params.subject}
        initialPlan={params.plan}
      />
    </main>
  );
}
