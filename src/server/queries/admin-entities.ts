import { prisma } from "@/lib/db";

/** Reference lists + entity reads for the admin CRUD screens. */

export async function listAdminMatches() {
  return prisma.match.findMany({
    where: { deletedAt: null },
    include: { matchTeams: { include: { team: true } }, venue: true },
    orderBy: [{ matchNumber: "desc" }],
  });
}

export async function getMatchForEdit(id: string) {
  return prisma.match.findFirst({
    where: { id, deletedAt: null },
    include: {
      matchTeams: { include: { team: true } },
      playingXI: { include: { player: { select: { id: true, fullName: true } } } },
    },
  });
}

export async function listAdminTeams() {
  return prisma.team.findMany({
    where: { deletedAt: null },
    include: {
      captain: { select: { id: true, fullName: true } },
      homeVenue: { select: { id: true, name: true } },
      _count: { select: { players: { where: { deletedAt: null } } } },
    },
    orderBy: { name: "asc" },
  });
}

export async function getTeamForEdit(id: string) {
  return prisma.team.findFirst({
    where: { id, deletedAt: null },
    include: {
      players: {
        where: { deletedAt: null },
        orderBy: { squadOrder: "asc" },
        select: { id: true, fullName: true, role: true, jerseyNumber: true },
      },
    },
  });
}

export async function listAdminPlayers() {
  return prisma.player.findMany({
    where: { deletedAt: null },
    include: {
      team: { select: { id: true, name: true, shortName: true, logoUrl: true, primaryColor: true } },
      popularVote: { select: { votes: true } },
    },
    orderBy: { fullName: "asc" },
  });
}

export async function getPlayerForEdit(id: string) {
  return prisma.player.findFirst({
    where: { id, deletedAt: null },
    include: { popularVote: { select: { votes: true } } },
  });
}

export async function listAdminVenues() {
  return prisma.venue.findMany({
    include: { _count: { select: { matches: true } } },
    orderBy: { name: "asc" },
  });
}

/** Active-season squads grouped by team — drives match XI pickers. */
export async function teamsWithSquads() {
  return prisma.team.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      shortName: true,
      primaryColor: true,
      players: {
        where: { deletedAt: null },
        orderBy: { squadOrder: "asc" },
        select: { id: true, fullName: true, role: true, jerseyNumber: true },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function venueOptions() {
  return prisma.venue.findMany({
    where: { isAvailable: true },
    select: { id: true, name: true, location: true },
    orderBy: { name: "asc" },
  });
}

export async function activeSeasonId(): Promise<string | null> {
  const s = await prisma.season.findFirst({ where: { isActive: true }, select: { id: true } });
  return s?.id ?? null;
}

export async function listSponsorsAndAds() {
  const [sponsors, ads] = await Promise.all([
    prisma.sponsor.findMany({ orderBy: { tier: "asc" } }),
    prisma.adCreative.findMany({
      include: { sponsor: { select: { name: true } } },
      orderBy: { placement: "asc" },
    }),
  ]);
  return { sponsors, ads };
}
