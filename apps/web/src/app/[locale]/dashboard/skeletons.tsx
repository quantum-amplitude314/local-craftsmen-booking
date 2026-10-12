import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";

function LoadingStatus() {
  const t = useTranslations("shell");

  return (
    <p role="status" className="sr-only">
      {t("loading")}
    </p>
  );
}

export function GreetingSkeleton() {
  return (
    <div aria-busy="true">
      <LoadingStatus />
      <Skeleton className="h-7 w-64 max-w-full" />
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <LoadingStatus />
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-72 w-full max-w-sm" />
    </div>
  );
}

export function ScheduleSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6 border-t pt-6">
      <LoadingStatus />
      <Skeleton className="h-9 w-48" />
      <div className="flex flex-wrap gap-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-40" />
      </div>
      <Skeleton className="h-72 w-full max-w-sm" />
    </div>
  );
}
