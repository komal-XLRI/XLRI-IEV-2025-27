"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Search, Trash2, UserPlus, Users } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  StatusBadge,
  Table,
  Tabs,
  Td,
  Th,
  Tr,
} from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { apiFetch, formatDate, initials } from "@/lib/client";
import { ROLES, type Role } from "@/lib/constants";

type Row = {
  _id: string;
  name: string;
  email: string;
  role: Role;
  status: string;
  rollNumber?: string | null;
  batch?: string | null;
  lastLoginAt?: string | null;
};

const ROLE_TONE: Record<Role, "brand" | "info" | "success" | "neutral"> = {
  ADMIN: "brand",
  STUDENT: "info",
  FACULTY: "success",
  MENTOR: "neutral",
};

const emptyForm = {
  name: "",
  email: "",
  role: "STUDENT" as Role,
  rollNumber: "",
  batch: "",
  status: "ACTIVE",
};

export function UsersClient({ users, currentUserId }: { users: Row[]; currentUserId: string }) {
  const router = useRouter();
  const { push } = useToast();

  const [tab, setTab] = React.useState("ALL");
  const [query, setQuery] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [editing, setEditing] = React.useState<Row | null>(null);
  const [deleting, setDeleting] = React.useState<Row | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (tab !== "ALL" && u.role !== tab) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.rollNumber ?? "").toLowerCase().includes(q)
      );
    });
  }, [users, tab, query]);

  const counts = React.useMemo(() => {
    const map: Record<string, number> = { ALL: users.length };
    for (const role of ROLES) map[role] = users.filter((u) => u.role === role).length;
    return map;
  }, [users]);

  async function createUser() {
    setSaving(true);
    try {
      await apiFetch("/api/admin/users", {
        json: {
          name: form.name,
          email: form.email,
          role: form.role,
          rollNumber: form.rollNumber || undefined,
          batch: form.batch || undefined,
        },
      });
      push("success", "Account created", `${form.name} can now sign in with their email.`);
      setCreating(false);
      setForm(emptyForm);
      router.refresh();
    } catch (err) {
      push("error", "Could not create account", err instanceof Error ? err.message : "Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function updateUser() {
    if (!editing) return;
    setSaving(true);
    try {
      await apiFetch(`/api/admin/users/${editing._id}`, {
        method: "PATCH",
        json: {
          name: form.name,
          email: form.email,
          role: form.role,
          status: form.status,
        },
      });
      push("success", "Account updated");
      setEditing(null);
      router.refresh();
    } catch (err) {
      push("error", "Could not update", err instanceof Error ? err.message : "Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function removeUser() {
    if (!deleting) return;
    setSaving(true);
    try {
      await apiFetch(`/api/admin/users/${deleting._id}`, { method: "DELETE" });
      push("success", "Account deleted", `${deleting.name} was removed.`);
      setDeleting(null);
      router.refresh();
    } catch (err) {
      push("error", "Could not delete", err instanceof Error ? err.message : "Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Users & roles"
        description="Everyone who can sign in. Sign-in is by one-time code sent to these email addresses."
        breadcrumb="Admin"
        action={
          <Button
            onClick={() => {
              setForm(emptyForm);
              setCreating(true);
            }}
          >
            <UserPlus className="h-4 w-4" />
            Add account
          </Button>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-3">
          <Tabs
            tabs={[
              { key: "ALL", label: "All", count: counts.ALL },
              ...ROLES.map((role) => ({
                key: role,
                label: role.charAt(0) + role.slice(1).toLowerCase(),
                count: counts[role],
              })),
            ]}
            active={tab}
            onChange={setTab}
          />
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--fg-subtle)]" />
            <Input
              placeholder="Search name, email or roll…"
              className="pl-9.5"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Users className="h-5 w-5" />}
            title="No accounts match"
            description={query ? "Try a different search term." : "Add an account to get started."}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Role</Th>
                <Th>Roll / Batch</Th>
                <Th>Status</Th>
                <Th>Last sign-in</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <Tr key={user._id}>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--brand-soft)] text-[11.5px] font-semibold text-[var(--brand-soft-fg)]">
                        {initials(user.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-medium">
                          {user.name}
                          {user._id === currentUserId && (
                            <span className="ml-1.5 text-[11.5px] font-normal text-[var(--fg-subtle)]">
                              (you)
                            </span>
                          )}
                        </p>
                        <p className="truncate text-[12px] text-[var(--fg-subtle)]">{user.email}</p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <Badge tone={ROLE_TONE[user.role]}>
                      {user.role.charAt(0) + user.role.slice(1).toLowerCase()}
                    </Badge>
                  </Td>
                  <Td className="text-[13px] whitespace-nowrap text-[var(--fg-muted)]">
                    {user.rollNumber ? (
                      <>
                        {user.rollNumber}
                        {user.batch && (
                          <span className="text-[var(--fg-subtle)]"> · {user.batch}</span>
                        )}
                      </>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td>
                    <StatusBadge status={user.status} />
                  </Td>
                  <Td className="text-[13px] whitespace-nowrap text-[var(--fg-muted)]">
                    {formatDate(user.lastLoginAt, "Never")}
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Edit"
                        onClick={() => {
                          setEditing(user);
                          setForm({
                            name: user.name,
                            email: user.email,
                            role: user.role,
                            rollNumber: user.rollNumber ?? "",
                            batch: user.batch ?? "",
                            status: user.status,
                          });
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Delete"
                        disabled={user._id === currentUserId}
                        onClick={() => setDeleting(user)}
                        className="text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Create */}
      <Dialog
        open={creating}
        onClose={() => setCreating(false)}
        title="Add account"
        description="The person signs in with a one-time code sent to this email."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button onClick={createUser} loading={saving} disabled={!form.name || !form.email}>
              Create account
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Full name" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Email" required hint="Must be the address they will sign in with.">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Role" required>
            <Select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role.charAt(0) + role.slice(1).toLowerCase()}
                </option>
              ))}
            </Select>
          </Field>

          {form.role === "STUDENT" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Roll number" required>
                <Input
                  value={form.rollNumber}
                  onChange={(e) => setForm({ ...form, rollNumber: e.target.value })}
                />
              </Field>
              <Field label="Batch">
                <Input
                  placeholder="e.g. 2024-26"
                  value={form.batch}
                  onChange={(e) => setForm({ ...form, batch: e.target.value })}
                />
              </Field>
            </div>
          )}
        </div>
      </Dialog>

      {/* Edit */}
      <Dialog
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit account"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={updateUser} loading={saving}>
              Save changes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Full name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Role">
              <Select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                disabled={editing?._id === currentUserId}
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role.charAt(0) + role.slice(1).toLowerCase()}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Status">
              <Select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                disabled={editing?._id === currentUserId}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </Select>
            </Field>
          </div>
          {editing?.role === "STUDENT" && (
            <p className="text-[12.5px] text-[var(--fg-subtle)]">
              Roll number and batch are edited on the Students page.
            </p>
          )}
        </div>
      </Dialog>

      {/* Delete */}
      <Dialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete account"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={removeUser} loading={saving}>
              Delete permanently
            </Button>
          </>
        }
      >
        <p className="text-[13.5px] leading-6 text-[var(--fg)]">
          Delete <span className="font-semibold">{deleting?.name}</span>? They will lose access
          immediately. Files already in Google Drive are not affected.
        </p>
      </Dialog>
    </>
  );
}
