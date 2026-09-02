import type { Metadata } from "next";
import { ClipboardList, Lock } from "lucide-react";
import { Callout, Card, CardHeader, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { FileList } from "@/components/file-list";
import { requirePageSession } from "@/lib/auth";
import { getStudentProfile, getStudentResources, getSummerInternship } from "@/lib/queries";

export const metadata: Metadata = { title: "Summer Internship" };
export const dynamic = "force-dynamic";

const REPORT_ORDER = ["REPORT_1", "REPORT_2", "REPORT_3"];

export default async function SummerInternshipPage() {
  const session = await requirePageSession(["STUDENT"]);
  const [profile, data] = await Promise.all([
    getStudentProfile(session.userId),
    getSummerInternship(),
  ]);

  if (!data || !profile) {
    return (
      <>
        <PageHeader title="Summer Internship" breadcrumb="Activities" />
        <Card>
          <EmptyState
            icon={<ClipboardList className="h-5 w-5" />}
            title="Summer Internship is not published yet"
          />
        </Card>
      </>
    );
  }

  const { activity, internship } = data;
  // Only files explicitly mapped to this student are ever fetched.
  const resources = await getStudentResources(String(profile._id), String(activity._id));

  const byCategory = new Map<string, any[]>();
  for (const r of resources) {
    const list = byCategory.get(r.category) ?? [];
    list.push(r);
    byCategory.set(r.category, list);
  }

  const reports = (internship?.reports ?? []).map((report: any, i: number) => ({
    ...report,
    category: REPORT_ORDER[i] ?? "OTHER",
  }));

  return (
    <>
      <PageHeader
        title={activity.name ?? "Summer Internship"}
        description={activity.description || "Your submitted internship reports."}
        breadcrumb="Activities"
        action={<StatusBadge status={activity.status} />}
      />

      <Callout tone="info" icon={<Lock className="h-4 w-4" />} title="View only">
        This activity is complete. You can read and download your own reports, but nothing can be
        changed or uploaded. Only files assigned to you appear here.
      </Callout>

      <div className="mt-5 space-y-5">
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
                  icon={<ClipboardList className="h-4 w-4" />}
                />
                <FileList
                  files={files}
                  showCategory={false}
                  emptyTitle="No file assigned to you"
                  emptyDescription="If you submitted a report and it is not showing, contact the IEV office so they can map it to your account."
                />
              </Card>
            );
          })
        ) : (
          <Card>
            <CardHeader
              title="My internship files"
              description={`${resources.length} file${resources.length === 1 ? "" : "s"} assigned to you`}
              icon={<ClipboardList className="h-4 w-4" />}
            />
            <FileList
              files={resources}
              emptyTitle="No files assigned to you yet"
              emptyDescription="The IEV office maps each student's reports individually. Contact them if yours are missing."
            />
          </Card>
        )}
      </div>
    </>
  );
}
