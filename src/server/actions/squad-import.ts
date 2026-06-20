"use server";

import type { PlayerRole, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { squadImportSchema } from "@/lib/validation";
import { requireRole, MASTER_DATA_ROLES } from "@/server/auth";
import { writeAudit } from "@/server/audit";
import { ActionError } from "@/server/errors";
import { runAction, type ActionResult } from "@/server/result";
import {
  revalidatePublic,
  PUBLIC_SQUADS,
  PUBLIC_LEADERBOARD,
  PUBLIC_HOME,
} from "@/server/revalidate";

export interface SquadImportSummary {
  rowsParsed: number;
  teamsCreated: number;
  teamsReused: number;
  playersCreated: number;
  playersSkipped: number; // already on that team
  errors: string[];
}

/** Dark, contrast-safe (≥4.5:1 on white) default colours for new teams. */
const TEAM_COLORS = [
  "#3730A3", "#991B1B", "#065F46", "#92400E", "#6B21A8",
  "#115E59", "#1E40AF", "#9D174D", "#1F2937", "#0C4A6E",
];

// ---- tiny CSV parser (quoted fields, commas, CRLF) ----------------------
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n") {
      row.push(field); field = ""; rows.push(row); row = [];
    } else if (c === "\r") {
      // swallow — handled by the \n branch
    } else field += c;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

const norm = (s: string) => s.trim().toLowerCase().replace(/[\s_-]/g, "");

/** Match a header cell against a set of accepted aliases. */
function findCol(headers: string[], aliases: string[]): number {
  const set = new Set(aliases.map(norm));
  return headers.findIndex((h) => set.has(norm(h)));
}

function mapRole(raw: string | undefined): PlayerRole {
  const v = norm(raw ?? "");
  if (["batter", "bat", "batsman", "batting"].includes(v)) return "BATTER";
  if (["bowler", "bowl", "ball", "bowling"].includes(v)) return "BOWLER";
  if (["wicketkeeper", "keeper", "wk", "wkbatter", "wicketkeeperbatter"].includes(v))
    return "WICKET_KEEPER";
  // empty / "all-rounder" / anything else → plays as both bat & ball
  return "ALL_ROUNDER";
}

/** Derive a unique 2–4 char shortName, avoiding `used`. */
function deriveShortName(name: string, used: Set<string>): string {
  const alnum = name.toUpperCase().replace(/[^A-Z0-9]/g, "");
  let base = (alnum.slice(0, 3) || "TM").padEnd(2, "X").slice(0, 4);
  if (!used.has(base)) { used.add(base); return base; }
  const stem = base.slice(0, 3);
  for (let n = 1; n < 100; n++) {
    const cand = `${stem}${n}`.slice(0, 4);
    if (!used.has(cand)) { used.add(cand); return cand; }
  }
  // extremely unlikely fallback
  const cand = base.slice(0, 2) + Math.floor(Math.random() * 90 + 10);
  used.add(cand);
  return cand;
}

/**
 * Bulk-create teams + players from a pasted/uploaded CSV. Idempotent: existing
 * teams (by name, case-insensitive) are reused and players already on a team
 * are skipped, so re-running the same file does not duplicate anything.
 */
export async function importSquadCsv(
  raw: unknown,
): Promise<ActionResult<SquadImportSummary>> {
  return runAction(async () => {
    const { csv } = squadImportSchema.parse(raw);
    const actor = await requireRole(MASTER_DATA_ROLES);

    const grid = parseCsv(csv);
    if (grid.length < 2) {
      throw new ActionError(
        "VALIDATION",
        "CSV needs a header row and at least one data row.",
      );
    }
    const headers = grid[0];
    const teamCol = findCol(headers, ["team", "teamname", "club", "side"]);
    const playerCol = findCol(headers, ["player", "name", "fullname", "playername"]);
    const roleCol = findCol(headers, ["role", "type", "position"]);
    const jerseyCol = findCol(headers, ["jersey", "number", "no", "jerseynumber", "shirt"]);
    if (teamCol === -1 || playerCol === -1) {
      throw new ActionError(
        "VALIDATION",
        'CSV must have a "team" column and a "player" (or "name") column.',
      );
    }

    interface RowIn { team: string; player: string; role: PlayerRole; jersey: number | null }
    const errors: string[] = [];
    const parsed: RowIn[] = [];
    for (let i = 1; i < grid.length; i++) {
      const cells = grid[i];
      const team = (cells[teamCol] ?? "").trim();
      const player = (cells[playerCol] ?? "").trim();
      if (!team || !player) {
        errors.push(`Row ${i + 1}: missing team or player — skipped.`);
        continue;
      }
      const jerseyRaw = jerseyCol === -1 ? "" : (cells[jerseyCol] ?? "").trim();
      const jersey = jerseyRaw && /^\d+$/.test(jerseyRaw) ? Number(jerseyRaw) : null;
      parsed.push({
        team,
        player,
        role: mapRole(roleCol === -1 ? "" : cells[roleCol]),
        jersey,
      });
    }
    if (parsed.length === 0) {
      throw new ActionError("VALIDATION", "No usable rows found in the CSV.");
    }

    // Pre-load existing teams (names + shortNames are globally unique).
    const existingTeams = await prisma.team.findMany({
      select: { id: true, name: true, shortName: true, deletedAt: true },
    });
    const usedShort = new Set(existingTeams.map((t) => t.shortName.toUpperCase()));
    const teamByName = new Map<string, { id: string }>();
    for (const t of existingTeams) {
      if (!t.deletedAt) teamByName.set(t.name.trim().toLowerCase(), { id: t.id });
    }

    const summary: SquadImportSummary = {
      rowsParsed: parsed.length,
      teamsCreated: 0,
      teamsReused: 0,
      playersCreated: 0,
      playersSkipped: 0,
      errors,
    };

    await prisma.$transaction(async (tx) => {
      // distinct team names in first-seen order
      const order: string[] = [];
      const seen = new Set<string>();
      for (const r of parsed) {
        const key = r.team.toLowerCase();
        if (!seen.has(key)) { seen.add(key); order.push(r.team); }
      }

      let colorIdx = 0;
      const resolvedTeamId = new Map<string, string>(); // lower name -> id
      for (const name of order) {
        const key = name.trim().toLowerCase();
        const existing = teamByName.get(key);
        if (existing) {
          resolvedTeamId.set(key, existing.id);
          summary.teamsReused++;
          continue;
        }
        const shortName = deriveShortName(name, usedShort);
        const created = await tx.team.create({
          data: {
            name: name.trim(),
            shortName,
            primaryColor: TEAM_COLORS[colorIdx++ % TEAM_COLORS.length],
            status: "ACTIVE",
          },
          select: { id: true },
        });
        resolvedTeamId.set(key, created.id);
        summary.teamsCreated++;
      }

      // Existing players per resolved team, to skip duplicates by name.
      const teamIds = [...resolvedTeamId.values()];
      const existingPlayers = await tx.player.findMany({
        where: { teamId: { in: teamIds }, deletedAt: null },
        select: { teamId: true, fullName: true },
      });
      const playerKey = new Set(
        existingPlayers.map((p) => `${p.teamId}::${p.fullName.trim().toLowerCase()}`),
      );

      // squadOrder continues from current max per team
      const squadCounter = new Map<string, number>();
      const grouped = await tx.player.groupBy({
        by: ["teamId"],
        where: { teamId: { in: teamIds }, deletedAt: null },
        _max: { squadOrder: true },
      });
      for (const g of grouped) {
        if (g.teamId) squadCounter.set(g.teamId, g._max.squadOrder ?? 0);
      }

      const toCreate: Prisma.PlayerCreateManyInput[] = [];
      for (const r of parsed) {
        const teamId = resolvedTeamId.get(r.team.toLowerCase());
        if (!teamId) continue;
        const dedupe = `${teamId}::${r.player.trim().toLowerCase()}`;
        if (playerKey.has(dedupe)) { summary.playersSkipped++; continue; }
        playerKey.add(dedupe);
        const nextOrder = (squadCounter.get(teamId) ?? 0) + 1;
        squadCounter.set(teamId, nextOrder);
        toCreate.push({
          fullName: r.player.trim(),
          teamId,
          role: r.role,
          // all-rounders & bowlers get a generic bowling style so they read as bowlers
          bowlingStyle: r.role === "BATTER" || r.role === "WICKET_KEEPER" ? "NONE" : "RIGHT_ARM_MEDIUM",
          jerseyNumber: r.jersey,
          squadOrder: nextOrder,
          status: "ACTIVE",
        });
      }
      if (toCreate.length > 0) {
        await tx.player.createMany({ data: toCreate });
        summary.playersCreated += toCreate.length;
      }

      await writeAudit(tx, {
        userId: actor.userId,
        action: "squad.import",
        entityType: "Player",
        details: `CSV import: +${summary.teamsCreated} teams, +${summary.playersCreated} players (${summary.playersSkipped} skipped)`,
        after: { ...summary, errors: undefined },
      });
    });

    revalidatePublic(PUBLIC_SQUADS, PUBLIC_LEADERBOARD, PUBLIC_HOME);
    return summary;
  });
}
