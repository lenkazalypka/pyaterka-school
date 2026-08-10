import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Brand } from "@/components/brand";
import { DiagnosticTest } from "@/components/diagnostic/diagnostic-test";
import { diagnosticSubjects, diagnosticSubjectSlugs, isDiagnosticSubjectSlug } from "@/lib/diagnostic-tests";

type Props = { params: Promise<{ subject: string }> };

export function generateStaticParams() {
  return diagnosticSubjectSlugs.map((subject) => ({ subject }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subject } = await params;
  if (!isDiagnosticSubjectSlug(subject)) return { title: "Тест не найден" };
  return {
    title: `Тест: ${diagnosticSubjects[subject].name}`,
    description: `Короткая диагностика по предмету «${diagnosticSubjects[subject].name}» без регистрации.`,
  };
}

export default async function DiagnosticPage({ params }: Props) {
  const { subject } = await params;
  if (!isDiagnosticSubjectSlug(subject)) notFound();

  const diagnostic = diagnosticSubjects[subject];
  return (
    <main className="diagnostic-page">
      <header className="diagnostic-header"><Brand /><span>Узнай свой уровень</span></header>
      <div className="diagnostic-layout">
        <div className="diagnostic-intro">
          <span>{diagnostic.glyph}</span>
          <p>{diagnostic.intro}</p>
          <small>5 вопросов · без регистрации · около 4 минут</small>
        </div>
        <DiagnosticTest subject={diagnostic} />
      </div>
    </main>
  );
}
