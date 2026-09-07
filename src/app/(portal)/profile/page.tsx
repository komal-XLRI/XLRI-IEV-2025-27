import type { Metadata } from "next";
import { AlertTriangle, Award, BookOpen, Mail, UserSquare2 } from "lucide-react";
import { Badge, Card, CardBody, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { requirePageSession } from "@/lib/auth";
import { getStudentProfile } from "@/lib/queries";
import { initials } from "@/lib/client";

export const metadata: Metadata = { title: "My Profile" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await requirePageSession(["STUDENT"]);
  const profile = await getStudentProfile(session.userId);

  if (!profile) {
    return (
      <>
        <PageHeader title="My profile" />
        <Card>
          <EmptyState
            icon={<UserSquare2 className="h-5 w-5" />}
            title="No student record linked"
            description="Contact the IEV office to have your student profile created."
          />
        </Card>
      </>
    );
  }

  const sections = [
    {
      key: "background",
      label: "Background",
      icon: <BookOpen className="h-4 w-4" />,
      value: profile.background,
      empty: "Your background has not been recorded yet.",
    },
    {
      key: "strengths",
      label: "Strengths",
      icon: <Award className="h-4 w-4" />,
      value: profile.strengths,
      empty: "No strengths recorded yet.",
    },
    {
      key: "weakness",
      label: "Areas to develop",
      icon: <AlertTriangle className="h-4 w-4" />,
      value: profile.weakness,
      empty: "No development areas recorded yet.",
    },
  ];

  return (
    <>
      <PageHeader
        title="My profile"
        description="Your record as held by the IEV office. Contact them if anything needs correcting."
      />

      {/* A plain card, in the same language as the rest of the portal. */}
      <Card>
        <CardBody>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[var(--brand)] text-[16px] font-semibold text-[var(--brand-fg)]">
              {initials(profile.user?.name)}
            </span>

            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[18px] leading-6 font-semibold text-[var(--fg)]">
                {profile.user?.name ?? "—"}
              </h2>
              {profile.user?.email && (
                <a
                  href={`mailto:${profile.user.email}`}
                  className="mt-1 inline-flex max-w-full items-center gap-1.5 text-[13px] text-[var(--fg-muted)] transition-colors hover:text-[var(--brand)]"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{profile.user.email}</span>
                </a>
              )}
            </div>

            <div className="flex flex-wrap gap-2 sm:shrink-0">
              <Badge tone="brand">Roll {profile.rollNumber}</Badge>
              {profile.batch && <Badge tone="neutral">Batch {profile.batch}</Badge>}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* `items-start` so a short section does not stretch to match a long one. */}
      <div className="mt-5 grid items-start gap-5 lg:grid-cols-3">
        {sections.map((section) => (
          <Card key={section.key}>
            <CardHeader title={section.label} icon={section.icon} />
            <CardBody>
              {section.value ? (
                <p className="text-[13.5px] leading-6 whitespace-pre-wrap text-[var(--fg)]">
                  {section.value}
                </p>
              ) : (
                <p className="text-[13px] text-[var(--fg-subtle)] italic">{section.empty}</p>
              )}
            </CardBody>
          </Card>
        ))}
      </div>
    </>
  );
}
