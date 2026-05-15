export function SkeletonCard() {
  return (
    <div className="w-full bg-bg-elev border border-line rounded-lg p-4 animate-pulse">
      <div className="flex items-baseline justify-between gap-3">
        <div className="h-4 bg-line rounded w-2/3" />
        <div className="h-3 bg-line rounded w-12" />
      </div>
      <div className="h-3 bg-line rounded w-1/3 mt-2" />
      <div className="grid grid-cols-4 gap-2 mt-4">
        <div className="h-6 bg-line rounded" />
        <div className="h-6 bg-line rounded" />
        <div className="h-6 bg-line rounded" />
        <div className="h-6 bg-line rounded" />
      </div>
    </div>
  );
}
