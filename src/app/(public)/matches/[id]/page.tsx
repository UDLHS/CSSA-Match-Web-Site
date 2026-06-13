import Link from "next/link";
import { notFound } from "next/navigation";
import { MatchDetailView } from "@/components/public/match-detail-view";
import { getMatchDetailDTO } from "@/server/queries/match-detail";

export const dynamic = "force-dynamic";

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getMatchDetailDTO(id);
  if (!detail) notFound();

  const title = [detail.teams.home?.name, detail.teams.away?.name]
    .filter(Boolean)
    .join(" vs ");

  return (
    <div
      style={{
        padding: "clamp(14px, 2.5vw, 28px) clamp(10px, 3vw, 32px) 40px",
        maxWidth: 900,
        margin: "0 auto",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div className="row" style={{ justifyContent: "space-between" }}>
        <Link
          href="/matches"
          style={{ fontSize: 13, fontWeight: 600, color: "var(--primary)", textDecoration: "none" }}
        >
          ← All matches
        </Link>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>{title}</span>
      </div>
      <MatchDetailView initial={detail} />
    </div>
  );
}
