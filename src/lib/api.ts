import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "@/lib/auth";

type Handler<Ctx> = (req: Request, ctx: Ctx) => Promise<unknown>;

/**
 * Wraps a route handler so every thrown HttpError / ZodError becomes a clean
 * JSON error instead of a stack trace, and successful returns become JSON.
 */
export function withRoute<Ctx = unknown>(handler: Handler<Ctx>) {
  return async (req: Request, ctx: Ctx) => {
    try {
      const result = await handler(req, ctx);
      if (result instanceof NextResponse || result instanceof Response) return result;
      return NextResponse.json({ ok: true, data: result ?? null });
    } catch (err) {
      if (err instanceof HttpError) {
        return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
      }
      if (err instanceof ZodError) {
        return NextResponse.json(
          { ok: false, error: err.issues[0]?.message ?? "Invalid input.", issues: err.issues },
          { status: 422 },
        );
      }
      // A malformed id is a client mistake, not a server fault — and the raw
      // Mongoose CastError text leaks schema internals.
      if (isCastError(err)) {
        return NextResponse.json(
          { ok: false, error: "That record could not be found." },
          { status: 400 },
        );
      }
      if (isDuplicateKeyError(err)) {
        return NextResponse.json(
          { ok: false, error: "That record already exists." },
          { status: 409 },
        );
      }

      const message = err instanceof Error ? err.message : "Unexpected server error.";
      console.error("[api]", err);
      return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
  };
}

function isCastError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    ((err as { name?: string }).name === "CastError" ||
      (err as { name?: string }).name === "BSONError")
  );
}

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: number }).code === 11000;
}

export function badRequest(message: string) {
  return new HttpError(400, message);
}

export function notFound(message = "Not found.") {
  return new HttpError(404, message);
}

export function forbidden(message = "You do not have permission to do that.") {
  return new HttpError(403, message);
}

/** Strips Mongo internals so documents survive the server → client boundary. */
export function serialize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}
