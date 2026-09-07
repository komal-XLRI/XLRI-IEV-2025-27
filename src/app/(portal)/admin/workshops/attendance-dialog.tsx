"use client";

import * as React from "react";
import {
  CalendarDays,
  Clock,
  LayoutGrid,
  List,
  MapPin,
  Search,
  UserRound,
  Users,
} from "lucide-react";
import { Button, Dialog, Input } from "@/components/ui";
import { formatTimeRange, initials } from "@/lib/client";

export type Attendance = "PRESENT" | "ABSENT";
export type RosterStudent = {
  _id: string;
  rollNumber: string;
  batch?: string;
  userId?: { name?: string };
};

const STATES: { value: Attendance; label: string }[] = [
  { value: "PRESENT", label: "Present" },
  { value: "ABSENT", label: "Absent" },
];

/** Row tint and control colour for each state. */
const tone: Record<Attendance, { row: string; active: string }> = {
  PRESENT: {
    row: "border-[var(--ok)]/35 bg-[var(--ok-soft)]",
    active: "bg-[var(--ok)] text-[var(--on-accent)]",
  },
  ABSENT: {
    row: "border-[var(--danger)]/35 bg-[var(--danger-soft)]",
    active: "bg-[var(--danger)] text-[var(--on-accent)]",
  },
};

/**
 * The workshop attendance sheet.
 *
 * Everyone in the batch is listed on every session; a student who has never
 * been marked shows as absent rather than being missing from the sheet, so the
 * count at the bottom always covers the whole roster.
 */
export function AttendanceDialog({
  session,
  sessionNumber,
  sessionCount,
  students,
  roster,
  onChange,
  date,
  onDateChange,
  onClose,
  onSave,
  saving,
}: {
  session: any | null;
  sessionNumber: number;
  sessionCount: number;
  students: RosterStudent[];
  roster: Record<string, Attendance>;
  onChange: (next: Record<string, Attendance>) => void;
  date: string;
  onDateChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  const [view, setView] = React.useState<"list" | "grid">("list");
  const [query, setQuery] = React.useState("");

  // A fresh sheet each time the dialog is opened for a different session.
  React.useEffect(() => {
    if (session) setQuery("");
  }, [session]);

  const counts = React.useMemo(() => {
    let present = 0;
    for (const student of students) {
      if ((roster[String(student._id)] ?? "ABSENT") === "PRESENT") present += 1;
    }
    return { present, absent: students.length - present };
  }, [students, roster]);

  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        (s.userId?.name ?? "").toLowerCase().includes(q) ||
        s.rollNumber.toLowerCase().includes(q),
    );
  }, [students, query]);

  const set = (studentId: string, value: Attendance) =>
    onChange({ ...roster, [studentId]: value });

  /** Mark-all applies to whoever is on screen, so a search narrows it. */
  const markAll = (value: Attendance) => {
    const next = { ...roster };
    for (const student of visible) next[String(student._id)] = value;
    onChange(next);
  };

  const batches = [...new Set(students.map((s) => s.batch).filter(Boolean))];

  return (
    <Dialog
      open={Boolean(session)}
      onClose={onClose}
      title="Mark attendance"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={onSave}>
            Save attendance ({students.length} student{students.length === 1 ? "" : "s"})
          </Button>
        </>
      }
    >
      {session && (
        <>
          <p className="text-[14px] font-medium text-[var(--fg)]">{session.title}</p>

          {/* Everything about the session, so the marker knows which one this is. */}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-[var(--surface-2)] px-3.5 py-2.5 text-[12.5px] text-[var(--fg-muted)]">
            {/*
             * Editable: a session is often scheduled with no date, or held on a
             * different day. Saving the sheet settles the date it was taken on.
             */}
            <label className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              <span className="sr-only">Date attendance was taken</span>
              <input
                type="date"
                value={date}
                onChange={(e) => onDateChange(e.target.value)}
                className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[12.5px] text-[var(--fg)] focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]/20 focus:outline-none"
              />
            </label>
            {formatTimeRange(session.startTime, session.endTime) && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                {formatTimeRange(session.startTime, session.endTime)}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 shrink-0" />
              Session {sessionNumber} / {sessionCount}
            </span>
            {session.speaker && (
              <span className="inline-flex items-center gap-1.5">
                <UserRound className="h-3.5 w-3.5 shrink-0" />
                {session.speaker}
              </span>
            )}
            {session.venue && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {session.venue}
              </span>
            )}
          </div>

          <p className="mt-2 text-[12px] text-[var(--fg-subtle)]">
            The whole batch is listed{batches.length === 1 ? ` (${batches[0]})` : ""}. Anyone left
            unmarked is recorded as absent.
          </p>

          {/* Controls */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[12.5px] text-[var(--fg-muted)]">Mark all:</span>
              <button
                type="button"
                onClick={() => markAll("PRESENT")}
                className="rounded-lg border border-[var(--ok)]/40 bg-[var(--ok-soft)] px-2.5 py-1.5 text-[12.5px] font-medium text-[var(--ok)] transition-colors hover:brightness-95"
              >
                Present
              </button>
              <button
                type="button"
                onClick={() => markAll("ABSENT")}
                className="rounded-lg border border-[var(--danger)]/40 bg-[var(--danger-soft)] px-2.5 py-1.5 text-[12.5px] font-medium text-[var(--danger)] transition-colors hover:brightness-95"
              >
                Absent
              </button>
            </div>

            <div className="flex items-center gap-3">
              <p className="text-[12.5px] text-[var(--fg-muted)] tabular-nums">
                <span className="font-semibold text-[var(--ok)]">{counts.present}</span> present ·{" "}
                <span className="font-semibold text-[var(--danger)]">{counts.absent}</span> absent
              </p>

              <div className="flex rounded-lg border border-[var(--border)] p-0.5">
                {([
                  { key: "list" as const, icon: <List className="h-3.5 w-3.5" />, label: "List" },
                  { key: "grid" as const, icon: <LayoutGrid className="h-3.5 w-3.5" />, label: "Grid" },
                ]).map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setView(option.key)}
                    aria-pressed={view === option.key}
                    className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium transition-colors ${
                      view === option.key
                        ? "bg-[var(--brand)] text-[var(--brand-fg)]"
                        : "text-[var(--fg-muted)] hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    {option.icon}
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* A 29-student sheet needs a way to find one person. */}
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--fg-subtle)]" />
            <Input
              placeholder="Search by name or roll number…"
              className="pl-9.5"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {visible.length === 0 ? (
            <p className="mt-6 mb-2 text-center text-[13px] text-[var(--fg-subtle)]">
              No student matches “{query}”.
            </p>
          ) : view === "list" ? (
            <ul className="mt-3 space-y-2">
              {visible.map((student) => {
                const value = roster[String(student._id)] ?? "ABSENT";
                return (
                  <li
                    key={student._id}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${tone[value].row}`}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--brand-soft)] text-[11.5px] font-semibold text-[var(--brand-soft-fg)]">
                      {initials(student.userId?.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium text-[var(--fg)]">
                        {student.userId?.name ?? "—"}
                      </p>
                      <p className="text-[12px] text-[var(--fg-subtle)]">{student.rollNumber}</p>
                    </div>
                    <StateToggle
                      value={value}
                      onChange={(next) => set(String(student._id), next)}
                    />
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {visible.map((student) => {
                const value = roster[String(student._id)] ?? "ABSENT";
                return (
                  <div
                    key={student._id}
                    className={`rounded-xl border p-3 transition-colors ${tone[value].row}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--brand-soft)] text-[11px] font-semibold text-[var(--brand-soft-fg)]">
                        {initials(student.userId?.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-[var(--fg)]">
                          {student.userId?.name ?? "—"}
                        </p>
                        <p className="text-[11.5px] text-[var(--fg-subtle)]">
                          {student.rollNumber}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2.5">
                      <StateToggle
                        value={value}
                        onChange={(next) => set(String(student._id), next)}
                        full
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </Dialog>
  );
}

/** Segmented Present / Absent / Excused control for one student. */
function StateToggle({
  value,
  onChange,
  full,
}: {
  value: Attendance;
  onChange: (value: Attendance) => void;
  full?: boolean;
}) {
  return (
    <div
      role="group"
      className={`flex shrink-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5 ${
        full ? "w-full" : ""
      }`}
    >
      {STATES.map((state) => {
        const active = value === state.value;
        return (
          <button
            key={state.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(state.value)}
            className={`rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${
              full ? "flex-1" : ""
            } ${
              active
                ? tone[state.value].active
                : "text-[var(--fg-muted)] hover:bg-[var(--surface-hover)]"
            }`}
          >
            {state.label}
          </button>
        );
      })}
    </div>
  );
}
