import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import { deleteMatch, renameMatch } from "../db/matchRepo";
import { exportMatchBackup, downloadJson, importMatchBackup, readJsonFile } from "../utils/backup";
import MatchSetupWizard from "../components/match-setup/MatchSetupWizard";
import type { Match } from "../types";

function MatchCard({ match }: { match: Match }) {
  const navigate = useNavigate();
  const eventCount = useLiveQuery(() => db.events.where("matchId").equals(match.id).count(), [match.id]);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(match.name);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleRenameSubmit() {
    if (name.trim() && name.trim() !== match.name) {
      await renameMatch(match.id, name.trim());
    }
    setRenaming(false);
  }

  async function handleBackup() {
    const backup = await exportMatchBackup(match.id);
    const safeName = match.name.replace(/[^a-z0-9-_]+/gi, "_");
    downloadJson(`${safeName}-backup.json`, backup);
  }

  async function handleDelete() {
    setBusy(true);
    await deleteMatch(match.id);
  }

  return (
    <div className="card col" style={{ gap: "var(--space-3)" }}>
      {renaming ? (
        <div className="row">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRenameSubmit()}
          />
          <button className="small primary" onClick={handleRenameSubmit}>
            Save
          </button>
          <button className="small ghost" onClick={() => { setRenaming(false); setName(match.name); }}>
            Cancel
          </button>
        </div>
      ) : (
        <h3 style={{ cursor: "pointer" }} onClick={() => navigate(`/match/${match.id}/live`)}>
          {match.name}
        </h3>
      )}

      <p className="muted" style={{ margin: 0 }}>
        {match.date || "No date"} &middot; {match.competition || "No competition"} &middot; {match.venue || "No venue"}
      </p>

      <div className="row">
        <span className="team-chip">
          <span className="team-swatch" style={{ background: match.homeTeam.color }} />
          {match.homeTeam.name}
        </span>
        <span className="muted">vs</span>
        <span className="team-chip">
          <span className="team-swatch" style={{ background: match.awayTeam.color }} />
          {match.awayTeam.name}
        </span>
        <span className="badge" style={{ marginLeft: "auto" }}>
          {eventCount ?? "..."} events
        </span>
      </div>

      <div className="row wrap">
        <button className="primary" onClick={() => navigate(`/match/${match.id}/live`)}>
          Open live match
        </button>
        <button onClick={() => navigate(`/match/${match.id}/analysis`)}>Analysis</button>
        <button className="ghost" onClick={() => setRenaming(true)}>
          Rename
        </button>
        <button className="ghost" onClick={handleBackup}>
          Back up
        </button>
        {confirmingDelete ? (
          <>
            <span style={{ color: "var(--color-danger)" }}>Delete permanently?</span>
            <button className="danger" disabled={busy} onClick={handleDelete}>
              {busy ? "Deleting..." : "Confirm delete"}
            </button>
            <button className="ghost" onClick={() => setConfirmingDelete(false)}>
              Keep
            </button>
          </>
        ) : (
          <button className="danger" onClick={() => setConfirmingDelete(true)}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

export default function MatchLibraryPage() {
  const matches = useLiveQuery(() => db.matches.toArray(), []);
  const sorted = matches ? [...matches].sort((a, b) => b.updatedAt - a.updatedAt) : undefined;
  const [showWizard, setShowWizard] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const navigate = useNavigate();
  const importInputRef = useRef<HTMLInputElement>(null);

  async function handleImportFile(file: File) {
    setImportError(null);
    try {
      const raw = await readJsonFile(file);
      const match = await importMatchBackup(raw);
      navigate(`/match/${match.id}/live`);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Could not import this file.");
    }
  }

  return (
    <div className="col" style={{ gap: "var(--space-5)" }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Match library</h1>
          <p className="muted">Create a match, track it live, then review the stats.</p>
        </div>
        <div className="row">
          <input
            ref={importInputRef}
            type="file"
            accept="application/json"
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files?.[0]) handleImportFile(e.target.files[0]);
              e.target.value = "";
            }}
          />
          <button className="ghost" onClick={() => importInputRef.current?.click()}>
            Import backup
          </button>
          <button className="primary" onClick={() => setShowWizard(true)}>
            + New match
          </button>
        </div>
      </div>

      {importError && <p style={{ color: "var(--color-danger)" }}>{importError}</p>}

      {sorted && sorted.length === 0 && (
        <div className="card">
          <p>No matches yet. Create your first match to start tracking it live.</p>
        </div>
      )}

      <div className="col">
        {sorted?.map((m) => (
          <MatchCard key={m.id} match={m} />
        ))}
      </div>

      {showWizard && (
        <MatchSetupWizard
          onCancel={() => setShowWizard(false)}
          onCreated={(id) => {
            setShowWizard(false);
            navigate(`/match/${id}/live`);
          }}
        />
      )}
    </div>
  );
}
