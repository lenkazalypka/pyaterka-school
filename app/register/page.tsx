import { AuthScreen } from "@/components/auth-screen";
import { diagnosticSubjects, isDiagnosticSubjectSlug } from "@/lib/diagnostic-tests";
import { getPublicPlans } from "@/lib/public-site";

type RegisterParams = { name?: string; email?: string; phone?: string; diagnostic?: string; subject?: string; weak?: string; score?: string; exam?: string; grade?: string; subjects?: string; plan?: string };

export default async function Page({ searchParams }: { searchParams: Promise<RegisterParams> }) {
  const params = await searchParams;
  const plans = params.plan ? await getPublicPlans() : [];
  const diagnostic = params.diagnostic?.slice(0, 32) ?? "";
  const diagnosticSubject = isDiagnosticSubjectSlug(diagnostic) ? diagnostic : undefined;
  const diagnosticSubjectName = diagnosticSubject ? diagnosticSubjects[diagnosticSubject].name : params.subject?.slice(0, 80);
  const selectedSubjects = (params.subjects ?? "").split(",").filter(isDiagnosticSubjectSlug).slice(0, 4);
  const selectedPlan = plans.find((plan) => plan.code === params.plan);
  const exam = params.exam === "oge" ? "ОГЭ" : params.exam === "ege" ? "ЕГЭ" : undefined;
  const grade = /^([5-9]|10|11)$/.test(params.grade ?? "") ? Number(params.grade) : undefined;
  const selectionSummary = exam && grade && selectedSubjects.length && selectedPlan ? {
    exam,
    grade,
    subjects: selectedSubjects.map((slug) => diagnosticSubjects[slug].name),
    planName: selectedPlan.name,
    priceLabel: selectedPlan.priceLabel,
  } : undefined;

  return <AuthScreen
    mode="register"
    initialName={params.name?.slice(0, 80)}
    initialEmail={params.email?.slice(0, 254)}
    initialPhone={params.phone?.slice(0, 30)}
    diagnosticSubject={diagnosticSubject}
    diagnosticSubjectName={diagnosticSubjectName}
    diagnosticWeakTopics={params.weak?.slice(0, 400)}
    diagnosticScore={params.score?.slice(0, 20)}
    selectionSummary={selectionSummary}
  />;
}
