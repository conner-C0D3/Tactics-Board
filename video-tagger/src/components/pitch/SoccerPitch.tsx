import { useRef } from "react";
import type { PitchLocation } from "../../types";

export const PITCH_LENGTH = 120;
export const PITCH_WIDTH = 80;

export interface PitchMarker {
  id: string;
  location: PitchLocation;
  color: string;
  label?: string;
  shape?: "dot" | "cross" | "ring";
  radius?: number;
}

export interface PitchArrow {
  id: string;
  from: PitchLocation;
  to: PitchLocation;
  color: string;
  dashed?: boolean;
}

interface Props {
  onPitchClick?: (loc: PitchLocation) => void;
  markers?: PitchMarker[];
  arrows?: PitchArrow[];
  /** Half of the pitch to draw, for attacking-third shot maps etc. "full" by default. */
  crop?: "full" | "attacking-half";
  className?: string;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** StatsBomb-coordinate (120x80) SVG pitch. Click position is reported in the same coordinate space used for stored event locations. */
export default function SoccerPitch({ onPitchClick, markers = [], arrows = [], crop = "full", className }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  function handleClick(e: React.MouseEvent<SVGSVGElement>) {
    if (!onPitchClick || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = clamp(((e.clientX - rect.left) / rect.width) * PITCH_LENGTH, 0, PITCH_LENGTH);
    const y = clamp(((e.clientY - rect.top) / rect.height) * PITCH_WIDTH, 0, PITCH_WIDTH);
    onPitchClick({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
  }

  const viewBox = crop === "attacking-half" ? `60 0 60 80` : `0 0 ${PITCH_LENGTH} ${PITCH_WIDTH}`;
  const stroke = "#e2e8f0";
  const strokeWidth = 0.4;

  return (
    <svg
      ref={svgRef}
      viewBox={viewBox}
      className={className}
      onClick={handleClick}
      style={{
        width: "100%",
        aspectRatio: crop === "attacking-half" ? "60/80" : "3/2",
        background: "#15803d",
        borderRadius: "var(--radius)",
        cursor: onPitchClick ? "crosshair" : "default",
        display: "block",
      }}
    >
      {/* Pitch stripes for depth, purely decorative */}
      {Array.from({ length: 6 }).map((_, i) => (
        <rect key={i} x={i * 20} y={0} width={20} height={80} fill={i % 2 === 0 ? "#166534" : "#15803d"} />
      ))}

      {/* Outer boundary */}
      <rect x={0} y={0} width={PITCH_LENGTH} height={PITCH_WIDTH} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
      {/* Halfway line */}
      <line x1={60} y1={0} x2={60} y2={80} stroke={stroke} strokeWidth={strokeWidth} />
      {/* Center circle + spot */}
      <circle cx={60} cy={40} r={10} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
      <circle cx={60} cy={40} r={0.4} fill={stroke} />

      {/* Left goal area */}
      <rect x={0} y={18} width={18} height={44} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
      <rect x={0} y={30} width={6} height={20} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
      <circle cx={12} cy={40} r={0.4} fill={stroke} />
      <path d="M 18 32 A 10 10 0 0 1 18 48" fill="none" stroke={stroke} strokeWidth={strokeWidth} />
      <rect x={-2} y={36} width={2} height={8} fill="none" stroke={stroke} strokeWidth={strokeWidth} />

      {/* Right goal area */}
      <rect x={102} y={18} width={18} height={44} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
      <rect x={114} y={30} width={6} height={20} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
      <circle cx={108} cy={40} r={0.4} fill={stroke} />
      <path d="M 102 32 A 10 10 0 0 0 102 48" fill="none" stroke={stroke} strokeWidth={strokeWidth} />
      <rect x={120} y={36} width={2} height={8} fill="none" stroke={stroke} strokeWidth={strokeWidth} />

      {/* Corner arcs */}
      <path d="M 0 2 A 2 2 0 0 0 2 0" fill="none" stroke={stroke} strokeWidth={strokeWidth} />
      <path d="M 0 78 A 2 2 0 0 1 2 80" fill="none" stroke={stroke} strokeWidth={strokeWidth} />
      <path d="M 120 2 A 2 2 0 0 1 118 0" fill="none" stroke={stroke} strokeWidth={strokeWidth} />
      <path d="M 120 78 A 2 2 0 0 0 118 80" fill="none" stroke={stroke} strokeWidth={strokeWidth} />

      {arrows.map((a) => (
        <g key={a.id}>
          <defs>
            <marker id={`arrowhead-${a.id}`} markerWidth={4} markerHeight={4} refX={3} refY={2} orient="auto">
              <path d="M0,0 L4,2 L0,4 Z" fill={a.color} />
            </marker>
          </defs>
          <line
            x1={a.from.x}
            y1={a.from.y}
            x2={a.to.x}
            y2={a.to.y}
            stroke={a.color}
            strokeWidth={0.6}
            strokeDasharray={a.dashed ? "2,1.5" : undefined}
            markerEnd={`url(#arrowhead-${a.id})`}
          />
        </g>
      ))}

      {markers.map((m) => {
        const r = m.radius ?? 1.4;
        if (m.shape === "cross") {
          return (
            <g key={m.id} stroke={m.color} strokeWidth={0.6}>
              <line x1={m.location.x - r} y1={m.location.y - r} x2={m.location.x + r} y2={m.location.y + r} />
              <line x1={m.location.x - r} y1={m.location.y + r} x2={m.location.x + r} y2={m.location.y - r} />
            </g>
          );
        }
        if (m.shape === "ring") {
          return <circle key={m.id} cx={m.location.x} cy={m.location.y} r={r} fill="none" stroke={m.color} strokeWidth={0.6} />;
        }
        return <circle key={m.id} cx={m.location.x} cy={m.location.y} r={r} fill={m.color} stroke="#fff" strokeWidth={0.3} />;
      })}
    </svg>
  );
}
