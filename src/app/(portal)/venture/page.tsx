import type { Metadata } from "next";
import { Building2, Lightbulb, Target, UserCheck, Users } from "lucide-react";
import { Badge, Card, CardBody, CardHeader, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { requirePageSession } from "@/lib/auth";
import { getStudentProfile, getStudentVenture } from "@/lib/queries";
import { initials } from "@/lib/client";

export const metadata: Metadata = { title: "My Venture" };
export const dynamic = "force-dynamic";

export default async function VenturePage() {
  const session = await requirePageSession(["STUDENT"]);
  const profile = await getStudentProfile(session.userId);
  const venture = profile ? await getStudentVenture(String(profile._id)) : null;

  if (!venture) {
    return (
      <>
        <PageHeader title="My venture" />
        <Card>
          <EmptyState
            icon={<Building2 className="h-5 w-5" />}
            title="No venture registered yet"
            description="Your venture record has not been created. The IEV office sets this up along with your faculty and mentor assignment."
          />
        </Card>
      </>
    );
  }

  const people = [
    { role: "Faculty", person: venture.facultyId, icon: <UserCheck className="h-4 w-4" /> },
    { role: "Mentor", person: venture.mentorId, icon: <Users className="h-4 w-4" /> },
  ];

  return (
    <>
      <PageHeader
        title={venture.ventureName}
        description={venture.industry ? `Industry — ${venture.industry}` : undefined}
        breadcrumb="My venture"
        action={<StatusBadge status={venture.status} />}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader
              title="Problem statement"
              description="The problem this venture sets out to solve."
              icon={<Target className="h-4 w-4" />}
            />
            <CardBody>
              {venture.problemStatement ? (
                <p className="text-[13.5px] leading-6.5 whitespace-pre-wrap text-[var(--fg)]">
                  {venture.problemStatement}
                </p>
              ) : (
                <p className="text-[13px] text-[var(--fg-subtle)] italic">
                  No problem statement recorded yet.
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Solution"
              description="How the venture addresses the problem."
              icon={<Lightbulb className="h-4 w-4" />}
            />
            <CardBody>
              {venture.solution ? (
                <p className="text-[13.5px] leading-6.5 whitespace-pre-wrap text-[var(--fg)]">
                  {venture.solution}
                </p>
              ) : (
                <p className="text-[13px] text-[var(--fg-subtle)] italic">
                  No solution recorded yet.
                </p>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Guidance team" icon={<Users className="h-4 w-4" />} />
            <ul className="divide-y divide-[var(--border)]">
              {people.map(({ role, person, icon }) => (
                <li key={role} className="flex items-center gap-3 px-5 py-3.5">
                  {person ? (
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--brand-soft)] text-[12px] font-semibold text-[var(--brand-soft-fg)]">
                      {initials(person.name)}
                    </span>
                  ) : (
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--surface-hover)] text-[var(--fg-subtle)]">
                      {icon}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium tracking-wide text-[var(--fg-subtle)] uppercase">
                      {role}
                    </p>
                    <p className="truncate text-[13.5px] font-medium text-[var(--fg)]">
                      {person?.name ?? "Not assigned yet"}
                    </p>
                    {person?.email && (
                      <p className="truncate text-[12px] text-[var(--fg-muted)]">{person.email}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="At a glance" icon={<Building2 className="h-4 w-4" />} />
            <CardBody className="space-y-3 text-[13px]">
              <Row label="Venture" value={venture.ventureName} />
              <Row label="Industry" value={venture.industry || "Not set"} />
              <Row label="Status" value={<StatusBadge status={venture.status} />} />
              <Row
                label="Student"
                value={<Badge tone="neutral">Roll {profile?.rollNumber ?? "—"}</Badge>}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[var(--fg-muted)]">{label}</span>
      <span className="min-w-0 truncate text-right font-medium text-[var(--fg)]">{value}</span>
    </div>
  );
}
