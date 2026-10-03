import { useState } from "react";
import type { Player } from "../../types";
import { newId } from "../../utils/id";

interface Props {
  teamLabel: string;
  color: string;
  players: Player[];
  onChange: (players: Player[]) => void;
}

export default function PlayerListEditor({ teamLabel, color, players, onChange }: Props) {
  const [name, setName] = useState("");
  const [shirt, setShirt] = useState("");
  const [position, setPosition] = useState("");
  const [isStarter, setIsStarter] = useState(true);

  function addPlayer() {
    if (!name.trim()) return;
    const player: Player = {
      id: newId(),
      name: name.trim(),
      shirtNumber: shirt ? Number(shirt) : 0,
      position: position.trim() || undefined,
      isStarter,
    };
    onChange([...players, player]);
    setName("");
    setShirt("");
    setPosition("");
  }

  function removePlayer(id: string) {
    onChange(players.filter((p) => p.id !== id));
  }

  function toggleStarter(id: string) {
    onChange(players.map((p) => (p.id === id ? { ...p, isStarter: !p.isStarter } : p)));
  }

  const starters = players.filter((p) => p.isStarter);
  const subs = players.filter((p) => !p.isStarter);

  return (
    <div className="col">
      <div className="row">
        <span className="team-swatch" style={{ background: color }} />
        <h4 style={{ margin: 0 }}>{teamLabel} roster</h4>
      </div>

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
            onKeyDown={(e) => e.key === "Enter" && addPlayer()}
            placeholder="Jane Smith"
          />
        </div>
        <div style={{ flex: 1 }}>
          <label>Position (optional)</label>
          <input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="CM" />
        </div>
        <label className="row" style={{ marginBottom: 10, fontWeight: 500 }}>
          <input
            type="checkbox"
            style={{ width: "auto" }}
            checked={isStarter}
            onChange={(e) => setIsStarter(e.target.checked)}
          />
          Starting XI
        </label>
        <button type="button" onClick={addPlayer} className="small">
          Add player
        </button>
      </div>

      {players.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Position</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {[...starters, ...subs].map((p) => (
              <tr key={p.id}>
                <td>{p.shirtNumber || "-"}</td>
                <td>{p.name}</td>
                <td>{p.position || "-"}</td>
                <td>
                  <button type="button" className="small ghost" onClick={() => toggleStarter(p.id)}>
                    {p.isStarter ? "Starter" : "Substitute"}
                  </button>
                </td>
                <td>
                  <button type="button" className="small danger" onClick={() => removePlayer(p.id)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {players.length === 0 && <p className="muted">No players added yet.</p>}
    </div>
  );
}
