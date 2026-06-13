import Link from "next/link";
import { signOut } from "@/server/actions/auth";
import { Icon, IC } from "@/components/public/icons";

export const metadata = { title: "No access — Cricket Fiesta '26" };

export default function ForbiddenPage() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--background)",
        padding: 20,
      }}
    >
      <div className="card" style={{ padding: 32, maxWidth: 420, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
        <span style={{ width: 48, height: 48, borderRadius: "50%", background: "color-mix(in oklab, var(--danger) 12%, transparent)", color: "var(--danger)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon d={IC.shield} size={22} />
        </span>
        <span className="t-h3">No admin access</span>
        <span style={{ fontSize: 13, color: "var(--muted)" }}>
          Your account is signed in but isn&#39;t authorised for this console, or
          your access has been suspended. Contact a tournament super-admin.
        </span>
        <div className="row" style={{ gap: 8, marginTop: 4 }}>
          <Link href="/" className="btn btn-soft btn-sm" style={{ textDecoration: "none" }}>
            Go to public site
          </Link>
          <form action={signOut}>
            <button type="submit" className="btn btn-ghost btn-sm">Sign out</button>
          </form>
        </div>
      </div>
    </div>
  );
}
