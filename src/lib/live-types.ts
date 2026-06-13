import type {
  LiveSnapshotPayload,
  SnapshotInnings,
  SnapshotLive,
  SnapshotTeam,
} from "@/server/scoring/snapshot";

/** Client-safe view of one ScoreSnapshot row (type-only imports, no server code). */
export interface LiveSnapshotRead {
  matchId: string;
  version: number;
  status: LiveSnapshotPayload["status"];
  payload: LiveSnapshotPayload;
  updatedAt: string;
}

export type { LiveSnapshotPayload, SnapshotInnings, SnapshotLive, SnapshotTeam };
