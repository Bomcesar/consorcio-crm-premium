export function StatsCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-32 animate-pulse rounded-lg border border-border/50 bg-muted/50"
        />
      ))}
    </div>
  );
}
