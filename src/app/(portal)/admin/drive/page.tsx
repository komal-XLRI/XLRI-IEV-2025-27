import type { Metadata } from "next";
import { requirePageSession } from "@/lib/auth";
import { getCapstone, getStartupConclave, getSummerInternship } from "@/lib/queries";
import { driveConfigured, serviceAccountEmail } from "@/lib/drive";
import { DriveClient } from "./drive-client";

export const metadata: Metadata = { title: "Drive Folders" };
export const dynamic = "force-dynamic";

export default async function AdminDrivePage() {
  await requirePageSession(["ADMIN"]);

  const [internship, capstone, conclave] = await Promise.all([
    getSummerInternship(),
    getCapstone(),
    getStartupConclave(),
  ]);

  return (
    <DriveClient
      driveConfigured={driveConfigured}
      serviceAccountEmail={serviceAccountEmail}
      internship={internship?.internship ?? null}
      capstone={capstone?.capstone ?? null}
      conclave={conclave?.conclave ?? null}
    />
  );
}
