"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Check,
  ClipboardList,
  ExternalLink,
  FileSpreadsheet,
  FolderTree,
  GraduationCap,
  Link2,
  ShieldCheck,
} from "lucide-react";
import {
  Badge,
  Button,
  Callout,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  PageHeader,
} from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/client";

type FolderRow = {
  key: string;
  label: string;
  hint?: string;
  driveUrl?: string | null;
  payload: Record<string, unknown>;
};

export function DriveClient({
  driveConfigured,
  serviceAccountEmail,
  internship,
  capstone,
  conclave,
}: {
  driveConfigured: boolean;
  serviceAccountEmail: string | null;
  internship: any;
  capstone: any;
  conclave: any;
}) {
  const groups: { title: string; icon: React.ReactNode; rows: FolderRow[] }[] = [];

  if (internship) {
    groups.push({
      title: "Summer Internship",
      icon: <ClipboardList className="h-4 w-4" />,
      rows: [
        {
          key: "internship-root",
          label: "Root folder",
          hint: "The top-level Summer Internship folder.",
          driveUrl: internship.driveUrl,
          payload: { target: "internshipRoot", id: internship._id },
        },
        ...(internship.reports ?? []).map((report: any) => ({
          key: `internship-${report._id}`,
          label: report.name ?? "Report",
          hint: "Contains every student's PDF — map files to owners on the Mapping page.",
          driveUrl: report.driveUrl,
          payload: {
            target: "internshipReport",
            id: internship._id,
            reportId: String(report._id),
          },
        })),
      ],
    });
  }

  if (capstone) {
    groups.push({
      title: "Capstone",
      icon: <GraduationCap className="h-4 w-4" />,
      rows: [
        {
          key: "capstone-root",
          label: "Root folder",
          driveUrl: capstone.driveUrl,
          payload: { target: "capstoneRoot", id: capstone._id },
        },
        ...(capstone.reports ?? []).map((report: any) => ({
          key: `capstone-${report._id}`,
          label: report.name ?? "Report",
          driveUrl: report.driveUrl,
          payload: { target: "capstoneReport", id: capstone._id, reportId: String(report._id) },
        })),
        {
          key: "capstone-excel",
          label: "Excel tracker",
          hint: "A single file, not a folder — paste the file link.",
          driveUrl: capstone.excelFile?.driveUrl,
          payload: { target: "capstoneExcel", id: capstone._id },
        },
      ],
    });
  }

  if (conclave) {
    groups.push({
      title: "Startup Conclave",
      icon: <Building2 className="h-4 w-4" />,
      rows: [
        {
          key: "conclave-root",
          label: "Root folder",
          hint: "Contains every student's conclave PDF.",
          driveUrl: conclave.driveUrl,
          payload: { target: "conclaveRoot", id: conclave._id },
        },
      ],
    });
  }

  return (
    <>
      <PageHeader
        title="Google Drive folders"
        description="Point each completed activity at its Drive folder. Files stay in Drive; MongoDB stores only the reference."
        breadcrumb="Admin"
        action={
          <Badge tone={driveConfigured ? "success" : "warning"} dot>
            {driveConfigured ? "Drive connected" : "Drive not configured"}
          </Badge>
        }
      />

      {!driveConfigured && (
        <Callout tone="warning" title="Service account not configured" icon={<ShieldCheck className="h-4 w-4" />}>
          <p className="mb-2">
            Folder links can still be saved, but browsing, streaming and uploads stay disabled until
            a Google service account is set up. Add these to <code>.env.local</code> and restart:
          </p>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-[var(--surface)] p-3 font-mono text-[11.5px] leading-5 text-[var(--fg)]">
{`GOOGLE_SERVICE_ACCOUNT_EMAIL="…@….iam.gserviceaccount.com"
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n…\\n-----END PRIVATE KEY-----\\n"
GOOGLE_DRIVE_ROOT_FOLDER_ID="…"   # optional`}
          </pre>
          <p className="mt-2">
            Then share each IEV Drive folder with that service account email as an Editor.
          </p>
        </Callout>
      )}

      <Callout tone="info" className="mt-4" icon={<ShieldCheck className="h-4 w-4" />} title="Keep folders private">
        Never share these folders directly with students — they hold every student&rsquo;s files. The
        portal returns each student only the files mapped to them.
      </Callout>

      <AccessTester driveConfigured={driveConfigured} serviceAccountEmail={serviceAccountEmail} />

      <div className="mt-5 space-y-5">
        {groups.map((group) => (
          <Card key={group.title}>
            <CardHeader title={group.title} icon={group.icon} />
            <CardBody className="space-y-4">
              {group.rows.map((row) => (
                <FolderField key={row.key} row={row} />
              ))}
            </CardBody>
          </Card>
        ))}

        {groups.length === 0 && (
          <Card>
            <CardBody>
              <p className="text-[13.5px] text-[var(--fg-muted)]">
                No completed-activity records exist yet. Run <code>npm run seed</code> first.
              </p>
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}

type CheckResult = {
  ok: boolean;
  folderId: string;
  name?: string;
  isFolder?: boolean;
  fileCount?: number;
  subfolderCount?: number;
  subfolders?: { id: string; name: string }[];
  sample?: string[];
  canWrite?: boolean;
  error?: string;
};

/**
 * "Credentials present" and "can actually read the folders" are different
 * states, and the gap between them is where service-account setup goes wrong:
 * a folder the admin can see in their own browser is invisible to the service
 * account until it is shared with that address, and Google reports it as 404.
 */
function AccessTester({
  driveConfigured,
  serviceAccountEmail,
}: {
  driveConfigured: boolean;
  serviceAccountEmail: string | null;
}) {
  const { push } = useToast();
  const [folder, setFolder] = React.useState("");
  const [testing, setTesting] = React.useState(false);
  const [result, setResult] = React.useState<CheckResult | null>(null);

  async function test() {
    setTesting(true);
    setResult(null);
    try {
      const data = await apiFetch<CheckResult>(
        `/api/admin/drive/check?folder=${encodeURIComponent(folder)}`,
      );
      setResult(data);
    } catch (err) {
      setResult({
        ok: false,
        folderId: "",
        error: err instanceof Error ? err.message : "The test could not be run.",
      });
    } finally {
      setTesting(false);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      push("success", "Copied");
    } catch {
      push("error", "Could not copy", "Select the text and copy it manually.");
    }
  }

  return (
    <Card className="mt-5">
      <CardHeader
        title="Test folder access"
        description="Check whether the service account can actually reach a folder before you rely on it."
        icon={<ShieldCheck className="h-4 w-4" />}
      />
      <CardBody className="space-y-4">
        {serviceAccountEmail && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-[var(--surface-2)] px-3.5 py-2.5">
            <span className="text-[12.5px] text-[var(--fg-muted)]">Share folders with:</span>
            <code className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-[var(--fg)]">
              {serviceAccountEmail}
            </code>
            <Button size="sm" variant="secondary" onClick={() => copy(serviceAccountEmail)}>
              Copy
            </Button>
          </div>
        )}

        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Link2 className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--fg-subtle)]" />
            <Input
              placeholder="Paste any Drive folder link to test"
              className="pl-9.5"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && folder && !testing && test()}
            />
          </div>
          <Button onClick={test} loading={testing} disabled={!folder || !driveConfigured}>
            <FolderTree className="h-4 w-4" />
            Test access
          </Button>
        </div>

        {result && (
          <div
            className={
              result.ok
                ? "rounded-lg border border-[var(--ok)]/25 bg-[var(--ok-soft)] p-4"
                : "rounded-lg border border-[var(--danger)]/25 bg-[var(--danger-soft)] p-4"
            }
          >
            {result.ok ? (
              <>
                <p className="flex items-center gap-2 text-[13.5px] font-semibold text-[var(--ok)]">
                  <Check className="h-4 w-4" />
                  Reachable — {result.name}
                </p>
                <p className="mt-1.5 text-[12.5px] text-[var(--ok)]/85">
                  {result.isFolder === false
                    ? "This is a file, not a folder."
                    : `${result.fileCount} file(s), ${result.subfolderCount} sub-folder(s).`}
                  {result.canWrite === false &&
                    " Read-only — share as Editor if students must upload here."}
                </p>

                {result.sample && result.sample.length > 0 && (
                  <p className="mt-2 truncate font-mono text-[11.5px] text-[var(--ok)]/70">
                    {result.sample.join(" · ")}
                  </p>
                )}

                {result.subfolders && result.subfolders.length > 0 && (
                  <div className="mt-3 border-t border-[var(--ok)]/20 pt-3">
                    <p className="mb-1.5 text-[11.5px] font-semibold tracking-wide text-[var(--ok)]/80 uppercase">
                      Sub-folders — copy a link to use above
                    </p>
                    <ul className="space-y-1">
                      {result.subfolders.map((sub) => (
                        <li key={sub.id} className="flex items-center gap-2">
                          <span className="min-w-0 flex-1 truncate text-[12.5px] text-[var(--ok)]">
                            {sub.name}
                          </span>
                          <button
                            onClick={() =>
                              copy(`https://drive.google.com/drive/folders/${sub.id}`)
                            }
                            className="shrink-0 text-[12px] font-medium text-[var(--ok)] underline underline-offset-2"
                          >
                            Copy link
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-[13.5px] font-semibold text-[var(--danger)]">Not reachable</p>
                <p className="mt-1.5 text-[12.5px] leading-5 text-[var(--danger)]/90">
                  {result.error}
                </p>
              </>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function FolderField({ row }: { row: FolderRow }) {
  const router = useRouter();
  const { push } = useToast();
  const [value, setValue] = React.useState(row.driveUrl ?? "");
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  const dirty = value !== (row.driveUrl ?? "");

  async function save() {
    setSaving(true);
    try {
      await apiFetch("/api/admin/drive", { json: { ...row.payload, driveUrl: value } });
      push("success", "Drive link saved", row.label);
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
      router.refresh();
    } catch (err) {
      push("error", "Could not save", err instanceof Error ? err.message : "Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Field label={row.label} hint={row.hint}>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Link2 className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--fg-subtle)]" />
          <Input
            placeholder="Paste the Drive link or id, or leave blank to clear"
            className="pl-9.5"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        {row.driveUrl && (
          <a
            href={row.driveUrl}
            target="_blank"
            rel="noreferrer"
            className="grid h-9.5 w-9.5 shrink-0 place-items-center rounded-lg border border-[var(--border-strong)] text-[var(--fg-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--fg)]"
            title="Open in Drive"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
        <Button onClick={save} loading={saving} disabled={!dirty} variant={dirty ? "primary" : "secondary"}>
          {saved ? <Check className="h-4 w-4" /> : null}
          {saved ? "Saved" : "Save"}
        </Button>
      </div>
    </Field>
  );
}
