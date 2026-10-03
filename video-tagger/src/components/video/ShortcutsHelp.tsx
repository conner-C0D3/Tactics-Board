interface Shortcut {
  keys: string;
  description: string;
}

const SHORTCUTS: Shortcut[] = [
  { keys: "Space", description: "Play / pause" },
  { keys: "←  /  →", description: "Seek back / forward 5 seconds" },
  { keys: "Shift + ←/→", description: "Seek back / forward 1 second" },
  { keys: ",  /  .", description: "Step one frame back / forward" },
  { keys: "↑  /  ↓", description: "Increase / decrease playback speed" },
  { keys: "P", description: "Start tagging a pass at the current time" },
  { keys: "S", description: "Start tagging a shot at the current time" },
  { keys: "?", description: "Toggle this help" },
  { keys: "Esc", description: "Cancel tagging / close the open panel" },
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
