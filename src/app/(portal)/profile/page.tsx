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

      <Card className="overflow-hidden">
        <div className="relative h-24 bg-[var(--color-navy-900)]">
          <div className="surface-grid absolute inset-0 opacity-[0.08]" />
          {/* the green rule from the XLRI identity */}
          <div className="absolute inset-x-0 bottom-0 h-[3px] bg-[var(--color-xlri-green)]" />
        </div>

        <div className="px-5 pb-5 sm:px-6 sm:pb-6">
          {/*
           * Only the avatar is lifted over the banner. Pulling the whole row up
           * put the name across the green rule, and left it fighting the badges
           * for width until it truncated to a single letter on a phone.
           */}
          {/*
           * The avatar is a flex item, not a bare block: a grid box with no
           * width of its own would otherwise stretch the full width of the card.
           */}
          <div className="flex">
            <span className="-mt-10 grid h-20 w-20 shrink-0 place-items-center rounded-2xl border-4 border-[var(--surface)] bg-[var(--brand)] text-[22px] leading-none font-semibold text-[var(--brand-fg)]">
              {initials(profile.user?.name)}
            </span>
          </div>

          <div className="mt-3.5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="min-w-0">
              <h2 className="text-[19px] leading-7 font-semibold tracking-[-0.01em] text-[var(--fg)]">
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

            <div className="flex flex-wrap gap-2 sm:shrink-0 sm:justify-end">
              <Badge tone="brand">Roll {profile.rollNumber}</Badge>
              {profile.batch && <Badge tone="neutral">Batch {profile.batch}</Badge>}
            </div>
          </div>
        </div>
      </Card>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
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
