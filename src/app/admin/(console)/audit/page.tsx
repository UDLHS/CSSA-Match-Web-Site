import { prisma } from "@/lib/db";
import { requirePageRole } from "@/server/admin-guard";
import { SUPER_ADMIN_ONLY } from "@/server/auth";
import { PageHead, TableWrap, EmptyState } from "@/components/admin/kit";
import { Avatar } from "@/components/public/atoms";
import { IC } from "@/components/public/icons";

export const dynamic = "force-dynamic";

export const metadata = { title: "Audit logs — Fiesta Admin" };

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function AuditLogsPage() {
  await requirePageRole(SUPER_ADMIN_ONLY);

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { name: true } } },
  });

  return (
    <>
      <PageHead title="Audit logs" sub="Every change is recorded — who, what, when. Showing the latest 100 entries." />
      {logs.length === 0 ? (
        <EmptyState icon={IC.logs} title="No activity yet" />
      ) : (
        <TableWrap>
          <thead>
            <tr><th style={{ width: 120 }}>Time</th><th>User</th><th>Action</th><th>Entity</th><th>Details</th></tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="t-num" style={{ color: "var(--muted)", fontSize: 12 }}>{fmtTime(l.createdAt.toISOString())}</td>
                <td><span className="row" style={{ gap: 8 }}><Avatar name={l.user?.name ?? "System"} size={24} color="var(--primary)" /><span style={{ fontWeight: 600, fontSize: 12.5 }}>{l.user?.name ?? "System"}</span></span></td>
                <td><span className="badge badge-upcoming">{l.action}</span></td>
                <td style={{ fontWeight: 600, fontSize: 12.5 }}>{l.entityType}{l.entityId ? <span style={{ color: "var(--muted)", fontWeight: 400 }}> · {l.entityId.slice(-6)}</span> : null}</td>
                <td style={{ color: "var(--muted)", fontSize: 12.5 }}>{l.details ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
      <span className="t-small" style={{ color: "var(--muted)" }}>Audit entries are retained for the full season.</span>
    </>
  );
}
