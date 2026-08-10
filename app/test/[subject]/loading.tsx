import { Brand } from "@/components/brand";

export default function DiagnosticLoading() {
  return (
    <main className="diagnostic-page">
      <header className="diagnostic-header"><Brand /><span>Загружаем тест</span></header>
      <section className="diagnostic-card diagnostic-skeleton" aria-busy="true" aria-label="Загрузка диагностики">
        <div /><div /><div /><div />
      </section>
    </main>
  );
}
