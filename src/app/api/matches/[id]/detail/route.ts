import { NextResponse } from "next/server";
import { getMatchDetailDTO } from "@/server/queries/match-detail";

/** Full public scorecard payload — feeds the match modal/page tabs. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const detail = await getMatchDetailDTO(id);
  if (!detail) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Match not found" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }
  return NextResponse.json(detail, {
    headers: { "Cache-Control": "no-store" },
  });
}
