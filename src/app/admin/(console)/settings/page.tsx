import { prisma } from "@/lib/db";
import { requirePageRole } from "@/server/admin-guard";
import { SUPER_ADMIN_ONLY } from "@/server/auth";
import { DEFAULT_POINTS_CONFIG } from "@/lib/scoring";
import { SettingsForm } from "@/components/admin/settings/settings-form";
import { EmptyState } from "@/components/admin/kit";
import { IC } from "@/components/public/icons";
import type { PointsConfigInput } from "@/lib/validation/settings";

export const dynamic = "force-dynamic";

export const metadata = { title: "Settings — Fiesta Admin" };

export default async function AdminSettingsPage() {
  // Settings is SUPER_ADMIN only — re-gate at the page level.
  await requirePageRole(SUPER_ADMIN_ONLY);

  const season = await prisma.season.findFirst({
    where: { isActive: true },
    include: { tournament: true, settings: true },
  });
  if (!season) {
    return <EmptyState icon={IC.gear} title="No active season" sub="Seed or create a season first." />;
  }

  const s = season.settings;
  const pc = (s?.pointsConfig as PointsConfigInput | null) ?? DEFAULT_POINTS_CONFIG;

  return (
    <SettingsForm
      seasonId={season.id}
      tournamentName={`${season.tournament.name} · ${season.label}`}
      init={{
        defaultFormat: s?.defaultFormat ?? "T20",
        defaultOvers: s?.defaultOvers ?? 20,
        defaultBallsPerOver: s?.defaultBallsPerOver ?? 6,
        playersPerSide: s?.playersPerSide ?? 11,
        pointsWin: s?.pointsWin ?? 2,
        pointsTie: s?.pointsTie ?? 1,
        pointsLoss: s?.pointsLoss ?? 0,
        bonusPointEnabled: s?.bonusPointEnabled ?? false,
        nrrTiebreak: s?.nrrTiebreak ?? true,
        votingOpen: s?.votingOpen ?? false,
        votesPublic: s?.votesPublic ?? true,
      }}
      pointsConfig={pc}
    />
  );
}
