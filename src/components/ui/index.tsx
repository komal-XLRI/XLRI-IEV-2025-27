"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

/* ─────────────────────────────── Button ─────────────────────────────── */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--brand)] text-[var(--brand-fg)] hover:brightness-110 active:brightness-95 shadow-[var(--shadow-sm)]",
  secondary:
    "bg-[var(--surface)] text-[var(--fg)] border border-[var(--border-strong)] hover:bg-[var(--surface-hover)]",
  outline:
    "bg-transparent text-[var(--fg)] border border-[var(--border)] hover:bg-[var(--surface-hover)]",
  ghost: "bg-transparent text-[var(--fg-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--fg)]",
  danger: "bg-[var(--danger)] text-white hover:brightness-110 active:brightness-95",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-lg",
  md: "h-9.5 px-4 text-sm gap-2 rounded-lg",
  lg: "h-11 px-5 text-[15px] gap-2 rounded-xl",
  icon: "h-9 w-9 rounded-lg",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", loading, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium whitespace-nowrap transition-all duration-150",
        "disabled:pointer-events-none disabled:opacity-50",
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
});

/* ──────────────────────────────── Card ──────────────────────────────── */

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card", className)} {...props} />;
}

export function CardHeader({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand-soft-fg)]">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-[15px] leading-6 font-semibold text-[var(--fg)]">{title}</h2>
          {description && (
            <p className="mt-0.5 text-[13px] leading-5 text-[var(--fg-muted)]">{description}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}

/* ─────────────────────────────── Badge ──────────────────────────────── */

type BadgeTone = "neutral" | "brand" | "success" | "warning" | "info" | "danger";

const badgeTones: Record<BadgeTone, string> = {
  neutral: "bg-[var(--surface-hover)] text-[var(--fg-muted)] border-[var(--border)]",
  brand: "bg-[var(--brand-soft)] text-[var(--brand-soft-fg)] border-transparent",
  success: "bg-[var(--ok-soft)] text-[var(--ok)] border-transparent",
  warning: "bg-[var(--warn-soft)] text-[var(--warn)] border-transparent",
  info: "bg-[var(--info-soft)] text-[var(--info)] border-transparent",
  danger: "bg-[var(--danger-soft)] text-[var(--danger)] border-transparent",
};

export function Badge({
  tone = "neutral",
  className,
  dot,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  dot?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium tracking-wide whitespace-nowrap",
        badgeTones[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/* ──────────────────────────── Form controls ─────────────────────────── */

const fieldBase =
  "w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm text-[var(--fg)] " +
  "placeholder:text-[var(--fg-subtle)] transition-colors " +
  "focus:border-[var(--ring)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20 " +
  "disabled:cursor-not-allowed disabled:bg-[var(--surface-hover)] disabled:text-[var(--fg-subtle)]";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(fieldBase, "h-9.5", className)} {...props} />;
  },
);

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(fieldBase, "py-2 leading-6", className)} {...props} />;
});

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(fieldBase, "h-9.5 cursor-pointer appearance-none pr-8", className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238a93a3' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 10px center",
      }}
      {...props}
    />
  );
});

export function Field({
  label,
  hint,
  error,
  required,
  className,
  children,
}: {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block", className)}>
      {label && (
        <span className="mb-1.5 block text-[13px] font-medium text-[var(--fg)]">
          {label}
          {required && <span className="ml-0.5 text-[var(--danger)]">*</span>}
        </span>
      )}
      {children}
      {error ? (
        <span className="mt-1 block text-[12px] text-[var(--danger)]">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-[12px] text-[var(--fg-subtle)]">{hint}</span>
      ) : null}
    </label>
  );
}

/* ──────────────────────────────── Table ─────────────────────────────── */

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full border-collapse text-sm", className)} {...props} />
    </div>
  );
}

export function Th({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5 text-left text-[11.5px] font-semibold tracking-[0.06em] text-[var(--fg-muted)] uppercase",
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn("border-b border-[var(--border)] px-4 py-3 align-middle text-[var(--fg)]", className)}
      {...props}
    />
  );
}

export function Tr({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("transition-colors hover:bg-[var(--surface-hover)]", className)} {...props} />;
}

/* ────────────────────────────── Empty state ─────────────────────────── */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      {icon && (
        <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-[var(--surface-hover)] text-[var(--fg-subtle)]">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-[var(--fg)]">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-[13px] leading-5 text-[var(--fg-muted)]">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ─────────────────────────────── Dialog ─────────────────────────────── */

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const widths = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" };

  /*
   * Rendered into <body> rather than in place.
   *
   * `position: fixed` resolves against the nearest ancestor with a transform,
   * filter or perspective rather than the viewport. Any such ancestor — even an
   * identity transform left behind by a finished animation — silently drags the
   * dialog out of the viewport while its backdrop still covers the page, so the
   * screen dims with nothing visible on it. A portal makes that impossible.
   */
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <div
        className="animate-fade-in fixed inset-0 bg-[#0a1020]/55 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "animate-scale-in relative z-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)]",
          widths[size],
        )}
      >
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-[15px] font-semibold text-[var(--fg)]">{title}</h2>
          {description && (
            <p className="mt-0.5 text-[13px] text-[var(--fg-muted)]">{description}</p>
          )}
        </div>
        <div className="max-h-[65vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] bg-[var(--surface-2)] px-5 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/* ────────────────────────────── Stat tile ──────────────────────────── */

export function Stat({
  label,
  value,
  hint,
  icon,
  tone = "brand",
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: "brand" | "success" | "warning" | "info";
}) {
  const tones = {
    brand: "bg-[var(--brand-soft)] text-[var(--brand-soft-fg)]",
    success: "bg-[var(--ok-soft)] text-[var(--ok)]",
    warning: "bg-[var(--warn-soft)] text-[var(--warn)]",
    info: "bg-[var(--info-soft)] text-[var(--info)]",
  };
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-medium tracking-wide text-[var(--fg-muted)] uppercase">
            {label}
          </p>
          <p className="mt-1.5 text-2xl leading-none font-semibold tracking-tight text-[var(--fg)] tabular-nums">
            {value}
          </p>
          {hint && <p className="mt-1.5 text-[12px] text-[var(--fg-subtle)]">{hint}</p>}
        </div>
        {icon && (
          <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", tones[tone])}>
            {icon}
          </span>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────── Section ─────────────────────────────── */

export function PageHeader({
  title,
  description,
  action,
  breadcrumb,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  breadcrumb?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {breadcrumb && <div className="mb-1.5 text-[12.5px] text-[var(--fg-subtle)]">{breadcrumb}</div>}
        <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.01em] text-[var(--fg)]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-2xl text-[13.5px] leading-5 text-[var(--fg-muted)]">{description}</p>
        )}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

/* ────────────────────────── Status indicators ───────────────────────── */

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { tone: BadgeTone; label: string }> = {
    UPCOMING: { tone: "info", label: "Upcoming" },
    ONGOING: { tone: "warning", label: "Ongoing" },
    COMPLETED: { tone: "success", label: "Completed" },
    ACTIVE: { tone: "success", label: "Active" },
    INACTIVE: { tone: "neutral", label: "Inactive" },
    PRESENT: { tone: "success", label: "Present" },
    ABSENT: { tone: "danger", label: "Absent" },
    EXCUSED: { tone: "warning", label: "Excused" },
    SUBMITTED: { tone: "info", label: "Submitted" },
    REVIEWED: { tone: "success", label: "Reviewed" },
    REJECTED: { tone: "danger", label: "Rejected" },
  };
  const entry = map[status] ?? { tone: "neutral" as BadgeTone, label: status };
  return (
    <Badge tone={entry.tone} dot>
      {entry.label}
    </Badge>
  );
}

/* ──────────────────────────── Rating stars ──────────────────────────── */

export function Rating({
  value,
  onChange,
  size = 16,
  readOnly,
}: {
  value?: number | null;
  onChange?: (value: number) => void;
  size?: number;
  readOnly?: boolean;
}) {
  const [hover, setHover] = React.useState(0);
  const active = hover || value || 0;
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onMouseEnter={() => !readOnly && setHover(n)}
          onMouseLeave={() => !readOnly && setHover(0)}
          onClick={() => onChange?.(n)}
          className={cn("transition-transform", !readOnly && "cursor-pointer hover:scale-115")}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
        >
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={n <= active ? "var(--star)" : "none"}
            stroke={n <= active ? "var(--star)" : "var(--border-strong)"}
            strokeWidth="1.75"
            strokeLinejoin="round"
          >
            <path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.35 6.19 20.4l1.11-6.47L2.6 9.35l6.5-.95z" />
          </svg>
        </button>
      ))}
      {value ? (
        <span className="ml-1.5 text-[12.5px] font-medium text-[var(--fg-muted)] tabular-nums">
          {value}/5
        </span>
      ) : null}
    </span>
  );
}

/* ──────────────────────────────── Tabs ──────────────────────────────── */

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string; count?: number }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-[var(--border)]">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            "relative -mb-px shrink-0 border-b-2 px-3.5 py-2.5 text-[13.5px] font-medium transition-colors",
            active === tab.key
              ? "border-[var(--brand)] text-[var(--brand)]"
              : "border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)]",
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="ml-1.5 rounded-full bg-[var(--surface-hover)] px-1.5 py-0.5 text-[11px] tabular-nums">
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ────────────────────────────── Callout ─────────────────────────────── */

export function Callout({
  tone = "info",
  title,
  children,
  icon,
  className,
}: {
  tone?: "info" | "warning" | "success" | "danger";
  title?: string;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  const tones = {
    info: "bg-[var(--info-soft)] text-[var(--info)]",
    warning: "bg-[var(--warn-soft)] text-[var(--warn)]",
    success: "bg-[var(--ok-soft)] text-[var(--ok)]",
    danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
  };
  return (
    <div className={cn("flex gap-3 rounded-lg px-4 py-3", tones[tone], className)}>
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-0 text-[13px] leading-5">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && "mt-0.5", "opacity-90")}>{children}</div>}
      </div>
    </div>
  );
}
