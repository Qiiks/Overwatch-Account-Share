import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Container liveness probe. The client image reports its own health here; the API's
 * own /health and /ready cover the backend, so this route must not fail when the API
 * is unreachable (a restart loop would take the UI down with the API).
 */
export async function GET() {
  return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
}
