import { withRoute } from "@/lib/api";
import { destroySessionCookie } from "@/lib/session";

export const runtime = "nodejs";

export const POST = withRoute(async () => {
  await destroySessionCookie();
  return { signedOut: true };
});
