import { Readable } from "node:stream";
import { auth as gauth, drive as driveApi } from "@googleapis/drive";
import { HttpError } from "@/lib/auth";

const SCOPES = ["https://www.googleapis.com/auth/drive"];

export const driveConfigured = Boolean(
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
);

export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  size?: string;
  modifiedTime?: string;
  isFolder: boolean;
};

function getClient() {
  if (!driveConfigured) {
    throw new HttpError(
      503,
      "Google Drive is not configured on this server. Add GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY to enable Drive features.",
    );
  }
  const auth = new gauth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    // Private keys are stored with literal \n in .env, so restore real newlines.
    key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    scopes: SCOPES,
  });
  return driveApi({ version: "v3", auth });
}

/** Accepts a raw folder id or any Drive URL containing one. */
export function extractFolderId(input: string): string {
  const value = input.trim();
  const patterns = [/\/folders\/([a-zA-Z0-9_-]+)/, /[?&]id=([a-zA-Z0-9_-]+)/, /\/d\/([a-zA-Z0-9_-]+)/];
  for (const p of patterns) {
    const match = value.match(p);
    if (match) return match[1];
  }
  return value;
}

export function folderUrl(folderId: string) {
  return `https://drive.google.com/drive/folders/${folderId}`;
}

export const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? null;

/**
 * Turns a raw Google API failure into something an administrator can act on.
 *
 * The common case by far: the folder exists and the admin can see it in their
 * own browser, but it was never shared with the service account — which is a
 * separate Google identity and inherits nothing. Google answers that with a
 * bare 404, which reads like "wrong link" and sends people hunting for a typo.
 */
export function describeDriveError(err: unknown): { status: number; message: string } {
  const code = (err as { code?: number; status?: number })?.code ?? (err as any)?.status;
  const raw = err instanceof Error ? err.message : String(err);
  const who = serviceAccountEmail ? ` (${serviceAccountEmail})` : "";

  if (code === 404) {
    return {
      status: 404,
      message: `Drive returned "not found". Most often this means the folder has not been shared with the service account${who}. Ask the folder's owner to share it with that address, then try again. Double-check the link too.`,
    };
  }
  if (code === 403) {
    if (/insufficient|scope/i.test(raw)) {
      return {
        status: 403,
        message: "The service account is missing the Drive scope. Re-check the key and that the Drive API is enabled for the project.",
      };
    }
    return {
      status: 403,
      message: `The service account${who} can see this item but lacks permission for this action. Sharing it as Editor is required for uploads; Viewer is enough for reading.`,
    };
  }
  if (code === 401 || /invalid_grant|unauthorized/i.test(raw)) {
    return {
      status: 401,
      message:
        "Google rejected the credentials. Check GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is the full key including the BEGIN/END lines, with its newlines escaped as \\n.",
    };
  }
  if (/ENOTFOUND|ETIMEDOUT|ECONNREFUSED|network/i.test(raw)) {
    return { status: 503, message: "Could not reach Google Drive. Check the server's network access." };
  }
  return { status: 502, message: `Google Drive error: ${raw}` };
}

export type FolderCheck = {
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
 * Read-only probe used by the admin Drive page: can the service account
 * actually reach this folder, and what is in it?
 */
export async function checkFolderAccess(input: string): Promise<FolderCheck> {
  const folderId = extractFolderId(input);

  if (!driveConfigured) {
    return {
      ok: false,
      folderId,
      error:
        "Google Drive is not configured on this server. Add the service account credentials to .env.local and restart.",
    };
  }

  try {
    const meta = await getFileMeta(folderId);
    if (!meta.isFolder) {
      return {
        ok: true,
        folderId,
        name: meta.name,
        isFolder: false,
        fileCount: 0,
        subfolderCount: 0,
      };
    }

    const children = await listFolder(folderId);
    const subfolders = children.filter((c) => c.isFolder);
    const files = children.filter((c) => !c.isFolder);

    // capabilities.canAddChildren tells us whether uploads would succeed.
    let canWrite: boolean | undefined;
    try {
      const drive = getClient();
      const res = await drive.files.get({
        fileId: folderId,
        fields: "capabilities(canAddChildren)",
        supportsAllDrives: true,
      });
      canWrite = Boolean(res.data.capabilities?.canAddChildren);
    } catch {
      /* capability probe is best-effort */
    }

    return {
      ok: true,
      folderId,
      name: meta.name,
      isFolder: true,
      fileCount: files.length,
      subfolderCount: subfolders.length,
      subfolders: subfolders.slice(0, 25).map((f) => ({ id: f.id, name: f.name })),
      sample: files.slice(0, 5).map((f) => f.name),
      canWrite,
    };
  } catch (err) {
    return { ok: false, folderId, error: describeDriveError(err).message };
  }
}

export function fileUrl(fileId: string) {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

/** Lists the immediate children of a Drive folder. */
export async function listFolder(folderId: string): Promise<DriveFile[]> {
  const drive = getClient();
  const files: DriveFile[] = [];
  let pageToken: string | undefined;

  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType, webViewLink, size, modifiedTime)",
      pageSize: 200,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      orderBy: "folder,name",
    });
    for (const f of res.data.files ?? []) {
      files.push({
        id: f.id!,
        name: f.name ?? "Untitled",
        mimeType: f.mimeType ?? "",
        webViewLink: f.webViewLink ?? undefined,
        size: f.size ?? undefined,
        modifiedTime: f.modifiedTime ?? undefined,
        isFolder: f.mimeType === "application/vnd.google-apps.folder",
      });
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return files;
}

export async function getFileMeta(fileId: string): Promise<DriveFile> {
  const drive = getClient();
  const res = await drive.files.get({
    fileId,
    fields: "id, name, mimeType, webViewLink, size, modifiedTime",
    supportsAllDrives: true,
  });
  const f = res.data;
  return {
    id: f.id!,
    name: f.name ?? "Untitled",
    mimeType: f.mimeType ?? "",
    webViewLink: f.webViewLink ?? undefined,
    size: f.size ?? undefined,
    modifiedTime: f.modifiedTime ?? undefined,
    isFolder: f.mimeType === "application/vnd.google-apps.folder",
  };
}

/**
 * Streams a Drive file back through our own server. This is what lets the
 * portal keep Drive folders private: the file never has a public URL, and the
 * caller has already been authorised against activity_resources.
 */
export async function downloadFile(fileId: string) {
  const drive = getClient();
  const meta = await getFileMeta(fileId);
  const res = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "stream" },
  );
  return { meta, stream: res.data as unknown as NodeJS.ReadableStream };
}

export async function uploadFile(opts: {
  folderId: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<DriveFile> {
  const drive = getClient();
  const res = await drive.files.create({
    requestBody: { name: opts.fileName, parents: [opts.folderId] },
    media: { mimeType: opts.mimeType, body: Readable.from(opts.buffer) },
    fields: "id, name, mimeType, webViewLink, size, modifiedTime",
    supportsAllDrives: true,
  });
  const f = res.data;
  return {
    id: f.id!,
    name: f.name ?? opts.fileName,
    mimeType: f.mimeType ?? opts.mimeType,
    webViewLink: f.webViewLink ?? fileUrl(f.id!),
    size: f.size ?? undefined,
    modifiedTime: f.modifiedTime ?? undefined,
    isFolder: false,
  };
}

export async function createFolder(name: string, parentId?: string): Promise<DriveFile> {
  const drive = getClient();
  const parent = parentId ?? process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      ...(parent ? { parents: [parent] } : {}),
    },
    fields: "id, name, mimeType, webViewLink",
    supportsAllDrives: true,
  });
  return {
    id: res.data.id!,
    name: res.data.name ?? name,
    mimeType: "application/vnd.google-apps.folder",
    webViewLink: res.data.webViewLink ?? folderUrl(res.data.id!),
    isFolder: true,
  };
}

export function humanFileSize(bytes?: string | number) {
  const n = typeof bytes === "string" ? Number(bytes) : bytes;
  if (!n || Number.isNaN(n)) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let value = n;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}
