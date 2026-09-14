export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-6">
      <div className="skeleton h-9 w-72" />
      <div className="skeleton h-8 w-96 max-w-full" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-24" />)}</div>
      <div className="grid xl:grid-cols-[1fr_360px] gap-6"><div className="skeleton h-96" /><div className="skeleton h-96" /></div>
      <span className="sr-only">Laden…</span>
    </div>
  );
}
