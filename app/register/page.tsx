import { AuthScreen } from "@/components/auth-screen";
import { diagnosticSubjects, isDiagnosticSubjectSlug } from "@/lib/diagnostic-tests";

type RegisterParams = { name?: string; email?: string; phone?: string; diagnostic?: string; subject?: string; weak?: string; score?: string };

export default async function Page({ searchParams }: { searchParams: Promise<RegisterParams> }) {
  const params = await searchParams;
  const diagnostic = params.diagnostic?.slice(0, 32) ?? "";
  const diagnosticSubject = isDiagnosticSubjectSlug(diagnostic) ? diagnostic : undefined;
  const diagnosticSubjectName = diagnosticSubject ? diagnosticSubjects[diagnosticSubject].name : params.subject?.slice(0, 80);

  return <AuthScreen
    mode="register"
    initialName={params.name?.slice(0, 80)}
    initialEmail={params.email?.slice(0, 254)}
    initialPhone={params.phone?.slice(0, 30)}
    diagnosticSubject={diagnosticSubject}
    diagnosticSubjectName={diagnosticSubjectName}
    diagnosticWeakTopics={params.weak?.slice(0, 400)}
    diagnosticScore={params.score?.slice(0, 20)}
  />;
}
