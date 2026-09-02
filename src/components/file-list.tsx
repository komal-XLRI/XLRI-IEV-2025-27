"use client";

import { Download, ExternalLink, FileSpreadsheet, FileText, Presentation } from "lucide-react";
import { Badge, EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/client";
import { RESOURCE_CATEGORY_LABELS, type ResourceCategory } from "@/lib/constants";

export type PortalFile = {
  _id?: string;
  driveFileId: string;
  fileName: string;
  fileType?: string;
  category?: string;
  createdAt?: string;
  uploadedAt?: string;
};

function iconFor(fileType?: string, fileName?: string) {
  const name = (fileName ?? "").toLowerCase();
  const type = (fileType ?? "").toLowerCase();
  if (type.includes("presentation") || name.endsWith(".ppt") || name.endsWith(".pptx")) {
    return <Presentation className="h-4.5 w-4.5" />;
  }
  if (type.includes("sheet") || type.includes("excel") || name.endsWith(".xlsx") || name.endsWith(".csv")) {
    return <FileSpreadsheet className="h-4.5 w-4.5" />;
  }
  return <FileText className="h-4.5 w-4.5" />;
}

/**
 * Renders files through `/api/files/:id`, never a raw Drive link — the server
 * re-checks ownership on every open.
 */
export function FileList({
  files,
  emptyTitle = "No files yet",
  emptyDescription,
  showCategory = true,
}: {
  files: PortalFile[];
  emptyTitle?: string;
  emptyDescription?: string;
  showCategory?: boolean;
}) {
  if (files.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-5 w-5" />}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <ul className="divide-y divide-[var(--border)]">
      {files.map((file) => (
        <li
          key={file._id ?? file.driveFileId}
          className="flex items-center gap-3.5 px-5 py-3 transition-colors hover:bg-[var(--surface-hover)]"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand-soft-fg)]">
            {iconFor(file.fileType, file.fileName)}
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-medium text-[var(--fg)]">{file.fileName}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-[var(--fg-subtle)]">
              {showCategory && file.category && (
                <Badge tone="neutral">
                  {RESOURCE_CATEGORY_LABELS[file.category as ResourceCategory] ?? file.category}
                </Badge>
              )}
              {(file.uploadedAt ?? file.createdAt) && (
                <span>Added {formatDate(file.uploadedAt ?? file.createdAt)}</span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <a
              href={`/api/files/${file.driveFileId}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border-strong)] px-2.5 text-[12.5px] font-medium text-[var(--fg)] transition-colors hover:bg-[var(--surface-hover)]"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View
            </a>
            <a
              href={`/api/files/${file.driveFileId}?download=1`}
              className="grid h-8 w-8 place-items-center rounded-lg text-[var(--fg-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--fg)]"
              title="Download"
              aria-label={`Download ${file.fileName}`}
            >
              <Download className="h-4 w-4" />
            </a>
          </div>
        </li>
      ))}
    </ul>
  );
}
