import { motion } from "framer-motion";
export function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />;
}
export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-border p-4 space-y-3">
      <SkeletonLine className="h-4 w-1/3" />
      <SkeletonLine className="h-3 w-2/3" />
      <SkeletonLine className="h-8 w-1/2" />
    </div>
  );
}
export function SkeletonStats() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-2xl bg-muted/50 p-4 space-y-2">
          <SkeletonLine className="h-3 w-1/2" />
          <SkeletonLine className="h-6 w-3/4" />
          <SkeletonLine className="h-2 w-1/3" />
        </div>
      ))}
    </div>
  );
}
