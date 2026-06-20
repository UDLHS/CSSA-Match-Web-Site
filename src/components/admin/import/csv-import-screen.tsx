"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { importSquadCsv, type SquadImportSummary } from "@/server/actions/squad-import";
import { PageHead, Panel } from "@/components/admin/kit";
import { Icon, IC } from "@/components/public/icons";

const TEMPLATE = `team,player,role,jersey
CS Titans,Kasun Perera,Batter,7
CS Titans,Nuwan Silva,Bowler,11
CS Titans,Amal Fernando,All-rounder,24
CS Titans,Ravi Jayasuriya,Wicket-keeper,1
IT Strikers,Dinesh Madushanka,Bowler,9
IT Strikers,Sahan Cooray,,18`;

export function CsvImportScreen() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [csv, setCsv] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SquadImportSummary | null>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsv(await file.text());
    setResult(null);
    setError(null);
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "squad-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    const res = await importSquadCsv({ csv });
    setBusy(false);
    if (!res.ok) { setError(res.error.message); return; }
    setResult(res.data);
    if (fileRef.current) fileRef.current.value = "";
    router.refresh();
  };

  return (
    <>
      <PageHead
        title="Import teams & players (CSV)"
        sub="Upload or paste a CSV — teams and players (with roles) are created automatically. Existing teams are reused and duplicate players are skipped, so re-running is safe."
        actions={
          <button type="button" className="btn btn-soft" onClick={downloadTemplate}>
            <Icon d={IC.download} size={15} /> Template
          </button>
        }
      />

      <div className="grid max-lg:grid-cols-1 lg:grid-cols-[7fr_5fr]" style={{ gap: 16, alignItems: "start" }}>
        <Panel title="CSV data">
          <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
            <label className="btn btn-soft btn-sm" style={{ cursor: "pointer" }}>
              <Icon d={IC.upload} size={14} /> Choose file
              <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} style={{ display: "none" }} />
            </label>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>…or paste below</span>
          </div>
          <span className="input" style={{ alignItems: "flex-start" }}>
            <textarea
              rows={12}
              value={csv}
              onChange={(e) => { setCsv(e.target.value); setResult(null); }}
              placeholder={TEMPLATE}
              spellCheck={false}
              style={{ background: "none", border: "none", outline: "none", color: "inherit", font: "inherit", fontFamily: "var(--font-mono, monospace)", fontSize: 12.5, width: "100%", resize: "vertical" }}
            />
          </span>
          {error && (
            <div className="row" style={{ gap: 8, fontSize: 12.5, color: "var(--danger)", background: "color-mix(in oklab, var(--danger) 10%, transparent)", padding: "10px 14px", borderRadius: 10 }}>
              <Icon d={IC.alert} size={14} /> {error}
            </div>
          )}
          {result && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="row" style={{ gap: 8, fontSize: 13, color: "var(--live, green)", fontWeight: 700 }}>
                <Icon d={IC.check2} size={15} /> Import complete
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 8 }}>
                <Stat label="Teams created" value={result.teamsCreated} />
                <Stat label="Teams reused" value={result.teamsReused} />
                <Stat label="Players added" value={result.playersCreated} />
                <Stat label="Players skipped" value={result.playersSkipped} />
              </div>
              {result.errors.length > 0 && (
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "var(--muted)" }}>
                  {result.errors.slice(0, 12).map((er, i) => <li key={i}>{er}</li>)}
                  {result.errors.length > 12 && <li>…and {result.errors.length - 12} more</li>}
                </ul>
              )}
            </div>
          )}
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-primary" onClick={submit} disabled={busy || csv.trim() === ""}>
              <Icon d={IC.upload} size={15} /> {busy ? "Importing…" : "Import CSV"}
            </button>
          </div>
        </Panel>

        <Panel title="Expected format">
          <div style={{ fontSize: 13, color: "var(--muted)", display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ margin: 0 }}>First row is the header. Column names are flexible (case-insensitive):</p>
            <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
              <li><b style={{ color: "var(--text)" }}>team</b> — required (also: club, side)</li>
              <li><b style={{ color: "var(--text)" }}>player</b> — required (also: name, fullname)</li>
              <li><b style={{ color: "var(--text)" }}>role</b> — optional: batter / bowler / all-rounder / wicket-keeper</li>
              <li><b style={{ color: "var(--text)" }}>jersey</b> — optional number (also: number, no)</li>
            </ul>
            <p style={{ margin: 0, padding: "10px 12px", background: "var(--surface-2)", borderRadius: 10, color: "var(--text)" }}>
              No role given? The player is added as an <b>all-rounder</b> (bats &amp; bowls).
            </p>
            <pre style={{ margin: 0, padding: "10px 12px", background: "var(--surface-2)", borderRadius: 10, overflowX: "auto", fontSize: 11.5, color: "var(--text)" }}>{TEMPLATE}</pre>
          </div>
        </Panel>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card" style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 2, boxShadow: "none" }}>
      <span className="t-num" style={{ fontWeight: 800, fontSize: 18 }}>{value}</span>
      <span style={{ fontSize: 10.5, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</span>
    </div>
  );
}
