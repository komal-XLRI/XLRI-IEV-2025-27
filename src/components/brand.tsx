"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { BRAND } from "@/lib/brand";

/**
 * The XLRI wordmark, drawn in type rather than traced from the crest.
 *
 * Used on its own until the official artwork is dropped in at
 * /public/xlri-logo.png — recreating an institutional crest by hand risks
 * shipping a subtly wrong version of it.
 */
function Wordmark({ onDark, className }: { onDark?: boolean; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-baseline leading-none font-bold tracking-[-0.02em]", className)}
      aria-hidden
    >
      <span className={onDark ? "text-white" : "text-[var(--fg)]"}>XLR</span>
      <span className="relative">
        <span className={onDark ? "text-white/90" : "text-[var(--fg)]"}>i</span>
        {/* the green flag on the i, straight from the identity */}
        <span
          className="absolute -top-[0.06em] -right-[0.22em] h-0 w-0"
          style={{
            borderLeft: "0.30em solid var(--accent-bright)",
            borderBottom: "0.26em solid transparent",
          }}
        />
      </span>
    </span>
  );
}

/**
 * Institutional lockup. `variant` controls the surface it sits on so the
 * fallback stays legible on both the light sidebar and the blue login panel.
 */
/**
 * Tried in order, so the logo can be dropped in as whatever format is to hand.
 * Each miss falls through to the next; running out lands on the wordmark.
 */
const LOGO_CANDIDATES = [
  "/xlri-logo.webp",
  "/xlri-logo.png",
  "/xlri-logo.svg",
  "/xlri-logo.jpg",
] as const;

export function Brand({
  variant = "light",
  size = "md",
  showUnit = true,
  className,
}: {
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  showUnit?: boolean;
  className?: string;
}) {
  const [candidate, setCandidate] = React.useState(0);
  const logoFailed = candidate >= LOGO_CANDIDATES.length;
  const onDark = variant === "dark";

  const mark = {
    sm: "h-7",
    md: "h-8.5",
    lg: "h-11",
  }[size];

  const wordmarkSize = {
    sm: "text-[15px]",
    md: "text-[18px]",
    lg: "text-[24px]",
  }[size];

  const titleSize = {
    sm: "text-[12.5px]",
    md: "text-[13.5px]",
    lg: "text-[15px]",
  }[size];

  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      {logoFailed ? (
        <span
          className={cn(
            "grid shrink-0 place-items-center rounded-lg px-2",
            mark,
            onDark ? "bg-white/12 ring-1 ring-white/20" : "bg-[var(--brand-soft)]",
          )}
        >
          <Wordmark onDark={onDark} className={wordmarkSize} />
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={LOGO_CANDIDATES[candidate]}
          src={LOGO_CANDIDATES[candidate]}
          alt={`${BRAND.institution} logo`}
          data-on-dark={onDark ? "true" : undefined}
          className={cn("brand-logo w-auto shrink-0 object-contain object-left", mark)}
          onError={() => setCandidate((i) => i + 1)}
        />
      )}

      {showUnit && (
        <span className="min-w-0 leading-tight">
          <span
            className={cn(
              "block truncate font-semibold",
              titleSize,
              onDark ? "text-white" : "text-[var(--fg)]",
            )}
          >
            {BRAND.unitShort} {BRAND.product}
          </span>
          <span
            className={cn(
              "block truncate text-[11px]",
              onDark ? "text-white/60" : "text-[var(--fg-subtle)]",
            )}
          >
            {/* The artwork already carries "XLRI · Xavier School of Management",
                so alongside it the campus alone is enough. */}
            {logoFailed ? BRAND.institution : BRAND.campus}
          </span>
        </span>
      )}
    </span>
  );
}

export { Wordmark };
