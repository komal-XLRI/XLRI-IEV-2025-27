import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Brand } from "@/components/brand";
import { BRAND } from "@/lib/brand";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

const HIGHLIGHTS = [
  {
    title: "Six tracked activities",
    body: "Workshop, Mentoring, Summer Internship, Capstone, Demo Day and the Startup Conclave — each with its own dates, sessions and records.",
  },
  {
    title: "Your files, only yours",
    body: "Reports live in Google Drive. The portal checks ownership on the server before any file is returned, so nobody sees another student's work.",
  },
  {
    title: "Feedback in one place",
    body: "Faculty and mentor ratings on every mentoring session, visible to the student they belong to.",
  },
];

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="relative hidden w-[46%] shrink-0 overflow-hidden bg-[var(--color-navy-900)] lg:block">
        <div className="surface-grid absolute inset-0 opacity-[0.07]" />
        <div
          className="absolute -top-40 -right-32 h-[26rem] w-[26rem] rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, #5f86d5, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, #8dc63f, transparent 70%)" }}
        />

        <div className="relative flex h-full flex-col justify-between p-12 xl:p-14">
          <Brand variant="dark" size="lg" />

          <div className="max-w-md">
            <h2 className="text-[28px] leading-[1.25] font-semibold tracking-[-0.02em] text-white">
              Every venture milestone, tracked in one place.
            </h2>
            <ul className="mt-8 space-y-5">
              {HIGHLIGHTS.map((item) => (
                <li key={item.title} className="flex gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-xlri-green)]" />
                  <div>
                    <p className="text-[14px] font-medium text-white">{item.title}</p>
                    <p className="mt-0.5 text-[13px] leading-5 text-white/60">{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[13px] font-medium tracking-[0.01em] text-[var(--color-xlri-green)] italic">
              {BRAND.tagline}
            </p>
            <p className="mt-2 text-[12px] text-white/40">
              © {new Date().getFullYear()} {BRAND.institutionFull} · {BRAND.unit}
            </p>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="flex justify-end p-4">
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-5 pb-16">
          <div className="animate-fade-rise w-full max-w-sm">
            <div className="mb-8 lg:hidden">
              <Brand size="md" />
            </div>
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
