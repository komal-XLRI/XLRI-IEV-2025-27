import type { Metadata } from "next";
import { FileSpreadsheet, GraduationCap, ListChecks, Lock, Target } from "lucide-react";
import {
  Callout,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  PageHeader,
  StatusBadge,
} from "@/components/ui";
import { FileList } from "@/components/file-list";
import { requirePageSession } from "@/lib/auth";
import { getCapstone, getStudentProfile, getStudentResources } from "@/lib/queries";

export const metadata: Metadata = { title: "Capstone" };
export const dynamic = "force-dynamic";

const REPORT_ORDER = ["CAPSTONE_REPORT_1", "CAPSTONE_REPORT_2"];

export default async function CapstonePage() {
  const session = await requirePageSession(["STUDENT"]);
  const [profile, data] = await Promise.all([getStudentProfile(session.userId), getCapstone()]);

  if (!data || !profile) {
    return (
      <>
        <PageHeader title="Capstone" breadcrumb="Activities" />
        <Card>
          <EmptyState
            icon={<GraduationCap className="h-5 w-5" />}
            title="Capstone is not published yet"
          />
        </Card>
      </>
    );
  }

  const { activity, capstone } = data;
  const resources = await getStudentResources(String(profile._id), String(activity._id));

  const byCategory = new Map<string, any[]>();
  for (const r of resources) {
    const list = byCategory.get(r.category) ?? [];
    list.push(r);
    byCategory.set(r.category, list);
  }

  const reports = (capstone?.reports ?? []).map((report: any, i: number) => ({
    ...report,
    category: REPORT_ORDER[i] ?? "OTHER",
  }));

  const excelFiles = byCategory.get("CAPSTONE_EXCEL") ?? [];
  const challenge = capstone?.challenge;

  return (
    <>
      <PageHeader
        title={activity.name ?? "Capstone"}
        description={activity.description}
        breadcrumb="Activities"
        action={<StatusBadge status={activity.status} />}
      />

      <Callout tone="info" icon={<Lock className="h-4 w-4" />} title="View only">
        The capstone is complete. Your submissions are read-only and visible to you alone.
      </Callout>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {reports.length > 0 ? (
            reports.map((report: any) => {
              const files = byCategory.get(report.category) ?? [];
              return (
                <Card key={report._id ?? report.category}>
                  <CardHeader
                    title={report.name ?? report.category}
                    description={
                      files.length > 0
                        ? `${files.length} file${files.length === 1 ? "" : "s"} assigned to you`
                        : "Nothing assigned to you for this report"
                    }
                    icon={<GraduationCap className="h-4 w-4" />}
                  />
                  <FileList files={files} showCategory={false} emptyTitle="No file assigned to you" />
                </Card>
              );
            })
          ) : (
            <Card>
              <CardHeader
                title="My capstone files"
                icon={<GraduationCap className="h-4 w-4" />}
                description={`${resources.length} file${resources.length === 1 ? "" : "s"} assigned to you`}
              />
              <FileList files={resources} emptyTitle="No files assigned to you yet" />
            </Card>
          )}

          {excelFiles.length > 0 && (
            <Card>
              <CardHeader
                title="Capstone tracker"
                description="Your row of the capstone spreadsheet."
                icon={<FileSpreadsheet className="h-4 w-4" />}
              />
              <FileList files={excelFiles} showCategory={false} />
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="The challenge" icon={<Target className="h-4 w-4" />} />
            <CardBody className="space-y-4">
              {challenge?.title ? (
                <>
                  <p className="text-[14.5px] leading-6 font-semibold text-[var(--fg)]">
                    {challenge.title}
                  </p>
                  {challenge.description && (
                    <p className="text-[13px] leading-6 whitespace-pre-wrap text-[var(--fg-muted)]">
                      {challenge.description}
                    </p>
                  )}
                  {challenge.instructions && (
                    <div className="rounded-lg bg-[var(--surface-2)] p-3.5">
                      <p className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-semibold tracking-wide text-[var(--fg-subtle)] uppercase">
                        <ListChecks className="h-3.5 w-3.5" />
                        Instructions
                      </p>
                      <p className="text-[13px] leading-6 whitespace-pre-wrap text-[var(--fg)]">
                        {challenge.instructions}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-[13px] text-[var(--fg-subtle)] italic">
                  The challenge brief has not been published.
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
