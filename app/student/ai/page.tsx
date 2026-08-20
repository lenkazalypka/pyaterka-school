import { ShieldCheck, Trash2 } from "lucide-react";
import { AiMentorChat } from "@/components/ai-mentor-chat";
import { StudentShell } from "@/components/student-shell";
import { clearAiHistory } from "@/app/student/ai/actions";
import { getStudentAiPageData } from "@/lib/ai-mentor";
import { aiMentorConfigured } from "@/lib/ai-provider";

export const dynamic = "force-dynamic";

export default async function StudentAiPage() {
  const data = await getStudentAiPageData();
  const enabled = aiMentorConfigured();
  return <StudentShell identity={data.identity} active="ai">
    <div className="student-page ai-mentor-page">
      <header className="student-page-heading"><div><span className="student-eyebrow">Beta · read-only</span><h1>AI-наставник</h1><p>Объясняет учебный материал и помогает выбрать следующий шаг на основе реального прогресса.</p></div>{data.conversation && <form action={clearAiHistory}><button className="ai-history-delete" type="submit"><Trash2 aria-hidden="true" />Удалить историю</button></form>}</header>
      {!enabled && <section className="student-notice" role="status"><ShieldCheck aria-hidden="true" /><div><b>AI-наставник пока не включён</b><p>История и учебный контекст защищены. Диалог станет доступен только после настройки server-only provider credentials и feature flag.</p></div></section>}
      <AiMentorChat key={data.conversation?.id ?? "new"} initialConversationId={data.conversation?.id ?? null} initialMessages={data.conversation?.messages ?? []} enabled={enabled} />
      <p className="ai-mentor-disclaimer">Ответ может содержать ошибку. Правила экзамена и важные решения проверяйте по официальным источникам и у преподавателя. История перестаёт быть доступна через 90 дней.</p>
    </div>
  </StudentShell>;
}
