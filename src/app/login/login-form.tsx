"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, KeyRound, Mail } from "lucide-react";
import { Button, Callout, Field, Input } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/client";

export function LoginForm() {
  const router = useRouter();
  const { push } = useToast();

  const [step, setStep] = React.useState<"email" | "code">("email");
  const [email, setEmail] = React.useState("");
  const [digits, setDigits] = React.useState<string[]>(Array(6).fill(""));
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [devCode, setDevCode] = React.useState<string | null>(null);
  const [deliveryError, setDeliveryError] = React.useState<string | null>(null);
  const [masterFallback, setMasterFallback] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(0);

  const inputsRef = React.useRef<(HTMLInputElement | null)[]>([]);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  React.useEffect(() => {
    if (step === "code") inputsRef.current[0]?.focus();
  }, [step]);

  async function requestCode(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await apiFetch<{
        delivered: boolean;
        devCode?: string;
        deliveryError?: string;
        masterFallback?: boolean;
      }>("/api/auth/request-otp", { json: { email } });

      setStep("code");
      setCooldown(45);
      setDigits(Array(6).fill(""));
      setDeliveryError(data.deliveryError ?? null);
      setMasterFallback(Boolean(data.masterFallback));

      if (data.masterFallback) {
        setDevCode(null);
        push(
          "warning",
          "Email could not be sent",
          "Use the backup sign-in code issued by the IEV office.",
        );
      } else if (data.devCode) {
        setDevCode(data.devCode);
        push(
          data.deliveryError ? "warning" : "info",
          data.deliveryError ? "Email could not be sent" : "Email delivery is not configured",
          "Your code is shown below so you can still sign in locally.",
        );
      } else {
        setDevCode(null);
        push("success", "Code sent", `Check ${email} for a 6-digit sign-in code.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function verify(code: string) {
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/api/auth/verify-otp", { json: { email, code } });
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setDigits(Array(6).fill(""));
      inputsRef.current[0]?.focus();
      setLoading(false);
    }
  }

  function setDigit(index: number, value: string) {
    const clean = value.replace(/\D/g, "");
    if (!clean && value !== "") return;

    const next = [...digits];

    if (clean.length > 1) {
      // Pasted or autofilled the whole code
      const chars = clean.slice(0, 6).split("");
      for (let i = 0; i < 6; i += 1) next[i] = chars[i] ?? "";
      setDigits(next);
      const full = next.join("");
      if (full.length === 6) void verify(full);
      else inputsRef.current[Math.min(chars.length, 5)]?.focus();
      return;
    }

    next[index] = clean;
    setDigits(next);
    if (clean && index < 5) inputsRef.current[index + 1]?.focus();

    // Six characters means six filled boxes — each slot holds at most one
    // digit, so the length is the whole check.
    const full = next.join("");
    if (full.length === 6) void verify(full);
  }

  function onKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) inputsRef.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < 5) inputsRef.current[index + 1]?.focus();
  }

  if (step === "email") {
    return (
      <form onSubmit={requestCode} className="space-y-5">
        <div>
          <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.01em] text-[var(--fg)]">
            Sign in to the portal
          </h1>
          <p className="mt-1.5 text-[13.5px] leading-5 text-[var(--fg-muted)]">
            Enter your registered institute email. We will send you a one-time code.
          </p>
        </div>

        {error && <Callout tone="danger">{error}</Callout>}

        <Field label="Institute email" required>
          <div className="relative">
            <Mail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--fg-subtle)]" />
            <Input
              type="email"
              autoComplete="email"
              autoFocus
              required
              placeholder="you@xlri.ac.in"
              className="pl-9.5"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </Field>

        <Button type="submit" size="lg" loading={loading} className="w-full">
          Send sign-in code
          {!loading && <ArrowRight className="h-4 w-4" />}
        </Button>

        <p className="text-center text-[12.5px] text-[var(--fg-subtle)]">
          Accounts are created by the IEV office. Contact them if you cannot sign in.
        </p>
      </form>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <button
          onClick={() => {
            setStep("email");
            setError(null);
            setDevCode(null);
            setDeliveryError(null);
            setMasterFallback(false);
          }}
          className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Use a different email
        </button>
        <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.01em] text-[var(--fg)]">
          Enter your code
        </h1>
        <p className="mt-1.5 text-[13.5px] leading-5 text-[var(--fg-muted)]">
          We sent a 6-digit code to <span className="font-medium text-[var(--fg)]">{email}</span>.
          It expires in 10 minutes.
        </p>
      </div>

      {error && <Callout tone="danger">{error}</Callout>}

      {deliveryError && (
        <Callout tone="danger" title="Email delivery failed">
          {deliveryError}
        </Callout>
      )}

      {masterFallback && (
        <Callout tone="warning" title="Email could not be sent" icon={<KeyRound className="h-4 w-4" />}>
          The one-time code did not go out. If the IEV office has issued you a backup sign-in
          code, enter it below.
        </Callout>
      )}

      {devCode && (
        <Callout tone="warning" title="Development mode" icon={<KeyRound className="h-4 w-4" />}>
          {deliveryError
            ? "The code could not be emailed, so it is shown here: "
            : "SMTP is not configured, so the code is shown here instead of emailed: "}
          <span className="font-mono text-[15px] font-bold tracking-[0.2em]">{devCode}</span>
        </Callout>
      )}

      <div className="flex justify-between gap-2">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={6}
            disabled={loading}
            value={digit}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            className="h-13 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] text-center text-xl font-semibold text-[var(--fg)] tabular-nums transition-colors focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]/20 focus:outline-none disabled:opacity-60"
          />
        ))}
      </div>

      <Button
        onClick={() => verify(digits.join(""))}
        size="lg"
        loading={loading}
        disabled={digits.join("").length !== 6}
        className="w-full"
      >
        Verify and continue
      </Button>

      <div className="text-center text-[12.5px] text-[var(--fg-muted)]">
        Did not get the code?{" "}
        <button
          onClick={() => requestCode()}
          disabled={cooldown > 0 || loading}
          className="font-medium text-[var(--brand)] transition-opacity hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
      </div>
    </div>
  );
}
