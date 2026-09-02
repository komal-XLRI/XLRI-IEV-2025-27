"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";

type ToastTone = "success" | "error" | "info" | "warning";
type Toast = { id: number; tone: ToastTone; title: string; description?: string };

const ToastContext = React.createContext<{
  push: (tone: ToastTone, title: string, description?: string) => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const nextId = React.useRef(1);

  const remove = React.useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = React.useCallback(
    (tone: ToastTone, title: string, description?: string) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, tone, title, description }]);
      setTimeout(() => remove(id), tone === "error" ? 7000 : 4500);
    },
    [remove],
  );

  const value = React.useMemo(() => ({ push }), [push]);

  const icons = {
    success: <CheckCircle2 className="h-4.5 w-4.5 text-[var(--ok)]" />,
    error: <XCircle className="h-4.5 w-4.5 text-[var(--danger)]" />,
    warning: <AlertTriangle className="h-4.5 w-4.5 text-[var(--warn)]" />,
    info: <Info className="h-4.5 w-4.5 text-[var(--info)]" />,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-100 flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "animate-scale-in pointer-events-auto flex items-start gap-3 rounded-xl border border-[var(--border)]",
              "bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow-lg)]",
            )}
          >
            <span className="mt-0.5 shrink-0">{icons[t.tone]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-medium text-[var(--fg)]">{t.title}</p>
              {t.description && (
                <p className="mt-0.5 text-[12.5px] leading-5 text-[var(--fg-muted)]">
                  {t.description}
                </p>
              )}
            </div>
            <button
              onClick={() => remove(t.id)}
              className="shrink-0 rounded p-0.5 text-[var(--fg-subtle)] transition-colors hover:text-[var(--fg)]"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
