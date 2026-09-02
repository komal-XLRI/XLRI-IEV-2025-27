import Link from "next/link";
import { ArrowUpRight, CalendarDays, Lock } from "lucide-react";
import { Badge, StatusBadge } from "@/components/ui";
import { formatDate, formatTimeRange } from "@/lib/client";
import { ACTIVITY_LABELS, type ActivityType } from "@/lib/constants";
import { cn } from "@/lib/cn";

export function ActivityCard({
  type,
  name,
  description,
  status,
  date,
  startTime,
  endTime,
  href,
  meta,
  icon,
  readOnly,
}: {
  type: ActivityType;
  name?: string;
  description?: string;
  status?: string;
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  href: string;
  meta?: React.ReactNode;
  icon: React.ReactNode;
  readOnly?: boolean;
}) {
  const time = formatTimeRange(startTime, endTime);

  return (
    <Link
      href={href}
      className={cn(
        "card group relative flex flex-col p-5 transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)]",
      )}
    >
      <div className="flex items-start gap-3.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand-soft-fg)] transition-transform duration-200 group-hover:scale-105">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-[15px] leading-6 font-semibold text-[var(--fg)]">
              {name ?? ACTIVITY_LABELS[type]}
            </h3>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-[var(--fg-subtle)] transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[var(--brand)]" />
          </div>
          {description && (
            <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-[var(--fg-muted)]">
              {description}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {status && <StatusBadge status={status} />}
        {readOnly && (
          <Badge tone="neutral">
            <Lock className="h-3 w-3" />
            View only
          </Badge>
        )}
        {date && (
          <span className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--fg-muted)]">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatDate(date)}
            {time && <span className="text-[var(--fg-subtle)]">· {time}</span>}
          </span>
        )}
      </div>

      {meta && (
        <div className="mt-4 border-t border-[var(--border)] pt-3.5 text-[12.5px] text-[var(--fg-muted)]">
          {meta}
        </div>
      )}
    </Link>
  );
}
