import { Skeleton } from "@/components/ui/skeleton";

export function TableLoading() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Skeleton className="mb-1 h-8 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-8 w-36" />
      </div>
      <Skeleton className="mb-4 h-10 w-72" />
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}
