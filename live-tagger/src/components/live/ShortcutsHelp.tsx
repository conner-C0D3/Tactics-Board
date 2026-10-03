interface Shortcut {
  keys: string;
  description: string;
}

const SHORTCUTS: Shortcut[] = [
  { keys: "H  /  A", description: "When picking a player: jump to the home / away team" },
  { keys: "0-9", description: "When picking a player: type a shirt number to select them instantly" },
  { keys: "?", description: "Toggle this help" },
  { keys: "Esc", description: "Close the open panel" },
];

interface Props {
  onClose: () => void;
}

export default function ShortcutsHelp({ onClose }: Props) {
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h3 style={{ margin: 0 }}>Keyboard shortcuts</h3>
          <button className="ghost small" onClick={onClose}>
            Close
          </button>
        </div>
        <table>
          <tbody>
            {SHORTCUTS.map((s) => (
              <tr key={s.keys}>
                <td style={{ whiteSpace: "nowrap" }}>
                  <span className="kbd">{s.keys}</span>
                </td>
                <td>{s.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted" style={{ marginTop: "var(--space-3)" }}>
          Shortcuts are disabled while typing into a text field.
        </p>
      </div>
    </div>
  );
}
