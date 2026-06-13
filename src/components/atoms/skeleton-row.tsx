import { cn } from "@/lib/utils";

/**
 * Skeleton primitives — shimmer blocks that match final row geometry.
 * Loading states use skeletons, never spinners (design spec).
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      aria-hidden
      className={cn("skeleton-shimmer block rounded-small", className)}
      {...props}
    />
  );
}

export interface SkeletonRowProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Show a leading avatar circle */
  avatar?: boolean;
  /** Widths (px) of the text blocks between avatar and trailing stat */
  widths?: number[];
  /** Show a trailing stat block */
  stat?: boolean;
}

export function SkeletonRow({
  avatar = true,
  widths = [110],
  stat = true,
  className,
  ...props
}: SkeletonRowProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn("flex items-center gap-2.5", className)}
      {...props}
    >
      {avatar && <Skeleton className="size-[34px] rounded-full" />}
      {widths.map((w, i) => (
        <Skeleton key={i} className="h-[13px]" style={{ width: w }} />
      ))}
      {stat && <Skeleton className="ml-auto h-[26px] w-14" />}
    </div>
  );
}
