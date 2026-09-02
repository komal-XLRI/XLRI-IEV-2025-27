/** Thin fetch wrapper that unwraps the `{ ok, data, error }` API envelope. */
export async function apiFetch<T = any>(
  url: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(url, {
    ...rest,
    ...(json !== undefined
      ? {
          method: rest.method ?? "POST",
          headers: { "Content-Type": "application/json", ...(rest.headers ?? {}) },
          body: JSON.stringify(json),
        }
      : {}),
  });

  let payload: any = null;
  try {
    payload = await res.json();
  } catch {
    /* non-JSON response */
  }

  if (!res.ok || payload?.ok === false) {
    throw new Error(payload?.error ?? `Request failed (${res.status})`);
  }
  return payload?.data as T;
}

export function formatDate(value?: string | Date | null, fallback = "—") {
  if (!value) return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(value?: string | Date | null, fallback = "—") {
  if (!value) return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTimeRange(start?: string | null, end?: string | null) {
  if (!start && !end) return "";
  if (start && end) return `${start} – ${end}`;
  return start ?? end ?? "";
}

/** For <input type="date"> values from a stored Date. */
export function toDateInput(value?: string | Date | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function initials(name?: string) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
