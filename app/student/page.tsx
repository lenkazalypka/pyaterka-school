import { Dashboard } from "@/components/dashboard";
import { configured } from "@/lib/supabase";
import { getStudentLearningData } from "@/lib/student-learning";

export const dynamic = "force-dynamic";

export default async function StudentPage({ searchParams }: { searchParams: Promise<{ payment_error?: string }> }) {
  if (!configured()) return <main className="grid min-h-screen place-items-center px-6"><div className="card max-w-xl p-8"><h1 className="text-3xl font-extrabold">Подключите Supabase</h1><p className="mt-3 text-[var(--text-muted)]">Защищённый кабинет не подставляет демонстрационные показатели вместо учебных данных.</p></div></main>;
  const [data, params] = await Promise.all([getStudentLearningData(), searchParams]);
  return <Dashboard data={data} paymentError={params.payment_error?.slice(0, 180)} />;
}
