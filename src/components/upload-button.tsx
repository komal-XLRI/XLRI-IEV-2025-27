"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui";
import { useToast } from "@/components/ui/toast";

/**
 * Posts a file to an endpoint as multipart form data. The server re-checks
 * ownership and the submission window — this is purely the trigger.
 */
export function UploadButton({
  endpoint,
  fields,
  accept = ".pdf,.ppt,.pptx",
  label = "Upload file",
  size = "sm",
  variant = "primary",
  disabled,
  disabledReason,
  onDone,
}: {
  endpoint: string;
  fields: Record<string, string>;
  accept?: string;
  label?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "outline";
  disabled?: boolean;
  disabledReason?: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const { push } = useToast();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const form = new FormData();
      for (const [key, value] of Object.entries(fields)) form.append(key, value);
      form.append("file", file);

      const res = await fetch(endpoint, { method: "POST", body: form });
      const payload = await res.json().catch(() => null);

      if (!res.ok || payload?.ok === false) {
        throw new Error(payload?.error ?? `Upload failed (${res.status})`);
      }

      push("success", "File uploaded", `${file.name} was saved to Google Drive.`);
      onDone?.();
      router.refresh();
    } catch (err) {
      push("error", "Upload failed", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFile}
        disabled={disabled || uploading}
      />
      <Button
        size={size}
        variant={variant}
        loading={uploading}
        disabled={disabled}
        title={disabled ? disabledReason : undefined}
        onClick={() => inputRef.current?.click()}
      >
        {!uploading && <Upload className="h-4 w-4" />}
        {uploading ? "Uploading…" : label}
      </Button>
    </>
  );
}
