/** Мгновенный отклик при переходе: скелетон, пока сервер готовит данные. */
export default function Loading() {
  return (
    <main className="animate-pulse space-y-4 px-4 pt-4" aria-busy="true" aria-label="Загрузка">
      <div className="h-8 w-40 rounded-xl bg-surface-2" />
      <div className="h-44 rounded-3xl bg-surface-2" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-20 rounded-2xl bg-surface-2" />
        <div className="h-20 rounded-2xl bg-surface-2" />
      </div>
      <div className="h-28 rounded-2xl bg-surface-2" />
      <div className="space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-2xl bg-surface-2" />
        ))}
      </div>
    </main>
  );
}
