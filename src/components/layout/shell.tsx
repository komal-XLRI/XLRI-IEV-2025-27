"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  CalendarRange,
  ChevronDown,
  ClipboardList,
  FolderTree,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Presentation,
  Rocket,
  Sparkles,
  Users,
  UserSquare2,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/client";
import type { Role } from "@/lib/constants";
import { ThemeToggle } from "./theme-toggle";
import { Brand } from "@/components/brand";
import { BRAND } from "@/lib/brand";

type NavItem = { href: string; label: string; icon: React.ReactNode };
type NavGroup = { heading: string; items: NavItem[] };

function navFor(role: Role): NavGroup[] {
  const ic = "h-4.5 w-4.5";

  if (role === "ADMIN") {
    return [
      {
        heading: "Overview",
        items: [{ href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className={ic} /> }],
      },
      {
        heading: "Programme",
        items: [
          { href: "/admin/activities", label: "Activities", icon: <CalendarRange className={ic} /> },
          { href: "/admin/workshops", label: "Workshops", icon: <Presentation className={ic} /> },
          { href: "/admin/mentoring", label: "Mentoring", icon: <Sparkles className={ic} /> },
          { href: "/admin/demo-day", label: "Demo Day", icon: <Rocket className={ic} /> },
        ],
      },
      {
        // Completed activities are Drive-backed and view-only for students, so
        // they get their own section: one folder link plus the per-student files.
        heading: "Completed Activities",
        items: [
          {
            href: "/admin/completed/summer-internship",
            label: "Summer Internship",
            icon: <ClipboardList className={ic} />,
          },
          {
            href: "/admin/completed/capstone",
            label: "Capstone",
            icon: <GraduationCap className={ic} />,
          },
          {
            href: "/admin/completed/startup-conclave",
            label: "Startup Conclave",
            icon: <Building2 className={ic} />,
          },
        ],
      },
      {
        heading: "Records",
        items: [
          { href: "/admin/students", label: "Students", icon: <GraduationCap className={ic} /> },
          { href: "/admin/ventures", label: "Ventures", icon: <Building2 className={ic} /> },
          { href: "/admin/users", label: "Users & Roles", icon: <Users className={ic} /> },
        ],
      },
      {
        heading: "Google Drive",
        items: [
          { href: "/admin/drive", label: "Drive Folders", icon: <FolderTree className={ic} /> },
          { href: "/admin/mapping", label: "File Mapping", icon: <ClipboardList className={ic} /> },
        ],
      },
    ];
  }

  if (role === "FACULTY" || role === "MENTOR") {
    return [
      {
        heading: "Overview",
        items: [{ href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className={ic} /> }],
      },
      {
        heading: "Reviews",
        items: [
          { href: "/reviews", label: "Mentoring Reviews", icon: <Sparkles className={ic} /> },
          { href: "/reviews/students", label: "My Students", icon: <GraduationCap className={ic} /> },
        ],
      },
    ];
  }

  return [
    {
      heading: "Overview",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className={ic} /> },
        { href: "/profile", label: "My Profile", icon: <UserSquare2 className={ic} /> },
        { href: "/venture", label: "My Venture", icon: <Building2 className={ic} /> },
      ],
    },
    {
      heading: "Activities",
      items: [
        { href: "/activities/workshop", label: "Workshop", icon: <Presentation className={ic} /> },
        { href: "/activities/mentoring", label: "Mentoring", icon: <Sparkles className={ic} /> },
        {
          href: "/activities/summer-internship",
          label: "Summer Internship",
          icon: <ClipboardList className={ic} />,
        },
        { href: "/activities/capstone", label: "Capstone", icon: <GraduationCap className={ic} /> },
        { href: "/activities/demo-day", label: "Demo Day", icon: <Rocket className={ic} /> },
        {
          href: "/activities/startup-conclave",
          label: "Startup Conclave",
          icon: <Building2 className={ic} />,
        },
      ],
    },
  ];
}

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrator",
  STUDENT: "Student",
  FACULTY: "Faculty",
  MENTOR: "Mentor",
};

export function Shell({
  user,
  children,
}: {
  user: { name: string; email: string; role: Role };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const groups = React.useMemo(() => navFor(user.role), [user.role]);

  React.useEffect(() => setMobileOpen(false), [pathname]);

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex h-15 shrink-0 items-center gap-2.5 border-b border-[var(--border)] px-4">
        <Brand className="min-w-0 flex-1" />
        <button
          onClick={() => setMobileOpen(false)}
          className="shrink-0 rounded-lg p-1.5 text-[var(--fg-muted)] lg:hidden"
          aria-label="Close navigation"
        >
          <X className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {groups.map((group) => (
          <div key={group.heading} className="mb-5 last:mb-0">
            <p className="mb-1.5 px-2.5 text-[10.5px] font-semibold tracking-[0.09em] text-[var(--fg-subtle)] uppercase">
              {group.heading}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-colors",
                        active
                          ? "bg-[var(--brand-soft)] text-[var(--brand-soft-fg)]"
                          : "text-[var(--fg-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--fg)]",
                      )}
                    >
                      {active && (
                        <span className="absolute top-1.5 bottom-1.5 -left-3 w-[3px] rounded-r-full bg-[var(--brand)]" />
                      )}
                      <span className={cn(active ? "text-[var(--brand)]" : "text-current")}>
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-[var(--border)] px-4 py-3">
        <p className="text-[11px] leading-4 text-[var(--fg-subtle)]">
          Files are stored in Google Drive. Access is checked on the server for every request.
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-[10.5px] text-[var(--fg-subtle)]">
          <span className="h-1 w-1 rounded-full bg-[var(--accent-bright)]" />
          {BRAND.institutionFull}
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-[var(--border)] bg-[var(--surface)] lg:block">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="animate-fade-in absolute inset-0 bg-[#0a1020]/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="animate-fade-in absolute inset-y-0 left-0 w-72 border-r border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)]">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        {/* Top bar */}
        <header className="no-print sticky top-0 z-30 flex h-15 items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)]/85 px-4 backdrop-blur-md sm:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-lg text-[var(--fg-muted)] transition-colors hover:bg-[var(--surface-hover)] lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <p className="hidden truncate text-[13px] text-[var(--fg-muted)] sm:block">
              {BRAND.unit}
              <span className="text-[var(--fg-subtle)]"> · {BRAND.campus}</span>
            </p>
          </div>

          <ThemeToggle />

          {/* Account menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              onBlur={() => setTimeout(() => setMenuOpen(false), 140)}
              className="flex items-center gap-2 rounded-lg py-1 pr-2 pl-1 transition-colors hover:bg-[var(--surface-hover)]"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--brand)] text-[12px] font-semibold text-[var(--brand-fg)]">
                {initials(user.name)}
              </span>
              <span className="hidden text-left leading-tight sm:block">
                <span className="block max-w-36 truncate text-[13px] font-medium text-[var(--fg)]">
                  {user.name}
                </span>
                <span className="block text-[11px] text-[var(--fg-subtle)]">
                  {ROLE_LABEL[user.role]}
                </span>
              </span>
              <ChevronDown className="h-4 w-4 text-[var(--fg-subtle)]" />
            </button>

            {menuOpen && (
              <div className="animate-scale-in absolute right-0 mt-1.5 w-60 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)]">
                <div className="border-b border-[var(--border)] px-4 py-3">
                  <p className="truncate text-[13.5px] font-medium text-[var(--fg)]">{user.name}</p>
                  <p className="truncate text-[12px] text-[var(--fg-muted)]">{user.email}</p>
                </div>
                <button
                  onClick={signOut}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13.5px] text-[var(--danger)] transition-colors hover:bg-[var(--surface-hover)]"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="animate-fade-rise mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
