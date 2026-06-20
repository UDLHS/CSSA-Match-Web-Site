import { IC } from "@/components/public/icons";
import type { AdminRole } from "@prisma/client";

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  /** Roles allowed to see/use this item. */
  roles: readonly AdminRole[];
  liveDot?: boolean;
}

const ALL: readonly AdminRole[] = ["SUPER_ADMIN", "ADMIN", "SCORE_UPDATER"];
const EDITORS: readonly AdminRole[] = ["SUPER_ADMIN", "ADMIN"];
const SUPER: readonly AdminRole[] = ["SUPER_ADMIN"];

/** Sidebar items (design-spec admin layout order). */
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: IC.grid, roles: ALL },
  { label: "Teams", href: "/admin/teams", icon: IC.shield, roles: EDITORS },
  { label: "Players", href: "/admin/players", icon: IC.users, roles: EDITORS },
  { label: "Import CSV", href: "/admin/import", icon: IC.upload, roles: EDITORS },
  { label: "Matches", href: "/admin/matches", icon: IC.trophy, roles: EDITORS },
  { label: "Venues", href: "/admin/venues", icon: IC.pin, roles: EDITORS },
  { label: "Live Scoring", href: "/admin/scoring", icon: IC.bolt, roles: ALL, liveDot: true },
  { label: "Popular Votes", href: "/admin/popular-votes", icon: IC.vote, roles: EDITORS },
  { label: "Sponsors & Ads", href: "/admin/sponsors", icon: IC.image, roles: EDITORS },
  { label: "Leaderboard", href: "/admin/leaderboard", icon: IC.refresh, roles: EDITORS },
  { label: "Standings", href: "/admin/standings", icon: IC.menu, roles: EDITORS },
  { label: "Audit Logs", href: "/admin/audit", icon: IC.logs, roles: SUPER },
  { label: "Admin Users", href: "/admin/users", icon: IC.user, roles: SUPER },
  { label: "Settings", href: "/admin/settings", icon: IC.gear, roles: SUPER },
];

export function navItemsForRole(role: AdminRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export const ROLE_LABEL: Record<AdminRole, string> = {
  SUPER_ADMIN: "Super admin",
  ADMIN: "Editor",
  SCORE_UPDATER: "Scorer",
};
