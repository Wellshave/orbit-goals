export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-6 pt-4">
      <div className="skeleton h-10 w-80 max-w-full" />
      <div className="skeleton h-40 w-full rounded-[22px]" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-44 rounded-[22px]" />)}</div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
