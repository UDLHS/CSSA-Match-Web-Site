import { prisma } from "@/lib/db";

/**
 * Impression beacon — the public AdSlot fires `navigator.sendBeacon` here on
 * mount, so counting never blocks the render path. Fire-and-forget; a failed
 * increment is not worth surfacing.
 */
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    await prisma.adCreative.update({
      where: { id },
      data: { impressions: { increment: 1 } },
    });
  } catch {
    // ad may have been deleted between render and beacon — ignore
  }
  return new Response(null, { status: 204 });
}
