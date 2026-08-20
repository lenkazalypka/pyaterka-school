export default function ParentLoading() {
  return <main className="mx-auto min-h-screen w-full max-w-6xl animate-pulse px-4 py-10" aria-busy="true" aria-label="Загружаем данные ученика">
    <div className="h-8 w-28 rounded-full bg-black/10" />
    <div className="mt-12 h-14 max-w-2xl rounded-2xl bg-black/10" />
    <div className="mt-8 h-72 rounded-3xl bg-black/10" />
  </main>;
}
