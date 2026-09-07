"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, FileStack, GraduationCap, Pencil, Search } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui";
import { initials } from "@/lib/client";
import { ImportStudents } from "@/components/import-students";
import { EditStudentDialog } from "@/components/edit-student";

type Row = {
  _id: string;
  rollNumber: string;
  batch?: string;
  background?: string;
  strengths?: string;
  weakness?: string;
  ventureName?: string | null;
  resourceCount: number;
  userId?: { name?: string; email?: string; status?: string };
};

export function StudentsClient({ students }: { students: Row[] }) {
  const router = useRouter();

  const [query, setQuery] = React.useState("");
  const [editing, setEditing] = React.useState<Row | null>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        (s.userId?.name ?? "").toLowerCase().includes(q) ||
        (s.userId?.email ?? "").toLowerCase().includes(q) ||
        s.rollNumber.toLowerCase().includes(q) ||
        (s.ventureName ?? "").toLowerCase().includes(q),
    );
  }, [students, query]);

  return (
    <>
      <PageHeader
        title="Students"
        description="Profiles for the batch. Import a roster, or add accounts one at a time from Users & Roles."
        breadcrumb="Admin"
        action={<ImportStudents />}
      />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-3">
          <p className="text-[13px] text-[var(--fg-muted)]">
            <span className="font-semibold text-[var(--fg)]">{students.length}</span> student
            {students.length === 1 ? "" : "s"} enrolled
          </p>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--fg-subtle)]" />
            <Input
              placeholder="Search students…"
              className="pl-9.5"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<GraduationCap className="h-5 w-5" />}
            title="No students found"
            description={
              query
                ? "Try a different search term."
                : "Add student accounts from the Users & Roles page."
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Student</Th>
                <Th>Roll</Th>
                <Th>Batch</Th>
                <Th>Venture</Th>
                <Th>Files</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((student) => (
                <Tr
                  key={student._id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/admin/students/${student._id}`)}
                >
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--brand-soft)] text-[11.5px] font-semibold text-[var(--brand-soft-fg)]">
                        {initials(student.userId?.name)}
                      </span>
                      <div className="min-w-0">
                        {/* A real link as well as the row click, so the record is
                            reachable by keyboard and openable in a new tab. */}
                        <Link
                          href={`/admin/students/${student._id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="block truncate text-[13.5px] font-medium hover:text-[var(--brand)] hover:underline"
                        >
                          {student.userId?.name ?? "—"}
                        </Link>
                        <p className="truncate text-[12px] text-[var(--fg-subtle)]">
                          {student.userId?.email}
                        </p>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-[13px] whitespace-nowrap">{student.rollNumber}</Td>
                  <Td className="text-[13px] whitespace-nowrap text-[var(--fg-muted)]">
                    {student.batch || "—"}
                  </Td>
                  <Td className="text-[13px]">
                    {student.ventureName ? (
                      <span className="truncate">{student.ventureName}</span>
                    ) : (
                      <Badge tone="warning">No venture</Badge>
                    )}
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-1.5 text-[13px] text-[var(--fg-muted)] tabular-nums">
                      <FileStack className="h-3.5 w-3.5" />
                      {student.resourceCount}
                    </span>
                  </Td>
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing(student);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <ChevronRight className="h-4 w-4 text-[var(--fg-subtle)]" />
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <EditStudentDialog student={editing} onClose={() => setEditing(null)} />
    </>
  );
}
