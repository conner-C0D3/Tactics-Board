import { useState } from "react";
import type { Player } from "../../types";
import { newId } from "../../utils/id";

interface Props {
  teamLabel: string;
  color: string;
  players: Player[];
  onChange: (players: Player[]) => void;
}

interface SectionProps {
  title: string;
  players: Player[];
  moveLabel: string;
  onAdd: (player: Omit<Player, "id" | "isStarter">) => void;
  onMove: (id: string) => void;
  onRemove: (id: string) => void;
}

function RosterSection({ title, players, moveLabel, onAdd, onMove, onRemove }: SectionProps) {
  const [name, setName] = useState("");
  const [shirt, setShirt] = useState("");
  const [position, setPosition] = useState("");

  function submit() {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), shirtNumber: shirt ? Number(shirt) : 0, position: position.trim() || undefined });
    setName("");
    setShirt("");
    setPosition("");
  }

  return (
    <div className="col" style={{ gap: "var(--space-2)" }}>
      <h5 style={{ margin: 0 }}>{title}</h5>

      <div className="row wrap" style={{ alignItems: "flex-end" }}>
        <div style={{ width: 90 }}>
          <label>#</label>
          <input
            inputMode="numeric"
            value={shirt}
            onChange={(e) => setShirt(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="7"
          />
        </div>
        <div style={{ flex: 2 }}>
          <label>Player name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Jane Smith"
          />
        </div>
        <div style={{ flex: 1 }}>
          <label>Position (optional)</label>
          <input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="CM" />
        </div>
        <button type="button" onClick={submit} className="small">
          Add to {title.toLowerCase()}
        </button>
      </div>

      {players.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Position</th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.id}>
                <td>{p.shirtNumber || "-"}</td>
                <td>{p.name}</td>
                <td>{p.position || "-"}</td>
                <td>
                  <button type="button" className="small ghost" onClick={() => onMove(p.id)}>
                    {moveLabel}
                  </button>
                </td>
                <td>
                  <button type="button" className="small danger" onClick={() => onRemove(p.id)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="muted" style={{ margin: 0 }}>
          No {title.toLowerCase()} added yet.
        </p>
      )}
    </div>
  );
}

export default function PlayerListEditor({ teamLabel, color, players, onChange }: Props) {
  const starters = players.filter((p) => p.isStarter);
  const subs = players.filter((p) => !p.isStarter);

  function addPlayer(isStarter: boolean, player: Omit<Player, "id" | "isStarter">) {
    onChange([...players, { ...player, id: newId(), isStarter }]);
  }

  function toggleStarter(id: string) {
    onChange(players.map((p) => (p.id === id ? { ...p, isStarter: !p.isStarter } : p)));
  }

  function removePlayer(id: string) {
    onChange(players.filter((p) => p.id !== id));
  }

  return (
    <div className="col" style={{ gap: "var(--space-3)" }}>
      <div className="row">
        <span className="team-swatch" style={{ background: color }} />
        <h4 style={{ margin: 0 }}>{teamLabel} roster</h4>
      </div>

      <RosterSection
        title="Starting XI"
        players={starters}
        moveLabel="Move to subs"
        onAdd={(p) => addPlayer(true, p)}
        onMove={toggleStarter}
        onRemove={removePlayer}
      />

      <RosterSection
        title="Substitutes"
        players={subs}
        moveLabel="Move to starters"
        onAdd={(p) => addPlayer(false, p)}
        onMove={toggleStarter}
        onRemove={removePlayer}
      />
    </div>
  );
}
