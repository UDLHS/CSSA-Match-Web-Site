import { NextRequest, NextResponse } from "next/server";
import { getMatchSnapshot } from "@/server/queries/public";

/**
 * THE public live-read contract (backend-spec §7): short-poll this endpoint
 * (Phase 5 adds SSE on top of the same snapshot row).
 *
 *   GET /api/matches/:id/live            → full snapshot
 *   GET /api/matches/:id/live?since=42   → { changed: false } when version
 *                                          is still 42 (cheap poll)
 *
 * Read-only, no session, no-store — every poll sees the latest committed
 * snapshot version.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const snapshot = await getMatchSnapshot(id);
  if (!snapshot) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "No live data for this match" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  const since = request.nextUrl.searchParams.get("since");
  if (since !== null && Number(since) === snapshot.version) {
    return NextResponse.json(
      { changed: false, version: snapshot.version },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { changed: true, ...snapshot },
    { headers: { "Cache-Control": "no-store" } },
  );
}
