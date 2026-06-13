import { NextResponse } from "next/server";
import { getPlayerProfileDTO } from "@/server/queries/player-profile";

/** Public player profile — feeds the player detail modal. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const profile = await getPlayerProfileDTO(id);
  if (!profile) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Player not found" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }
  return NextResponse.json(profile, {
    headers: { "Cache-Control": "no-store" },
  });
}
