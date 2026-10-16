import React from "react";

/**
 * Badge modérateur style Discord, avec progression :
 *   niveau 1 → argent    (0 - 99 signalements traités)
 *   niveau 2 → or        (100 - 9 999 signalements traités)
 *   niveau 3 → or royal  (10 000+ signalements traités)
 */
const NIVEAUX = {
  1: {
    title: "Modérateur (Argent) — 0 à 99 signalements traités",
    color: "#C0C0C0",
    stroke: "#FFFFFF",
    glow: "rgba(192, 192, 192, 0.5)",
  },
  2: {
    title: "Modérateur (Or) — 100 à 9 999 signalements traités",
    color: "#D4A233",
    stroke: "#FFF4C2",
    glow: "rgba(212, 162, 51, 0.55)",
  },
  3: {
    title: "Modérateur d'exception (Or royal) — 10 000+ signalements traités",
    color: "#B8872A",
    stroke: "#FFE07A",
    glow: "rgba(184, 135, 42, 0.65)",
  },
};

export default function BadgeModerateur({ size = 15, niveau = 1 }) {
  const n = NIVEAUX[niveau] || NIVEAUX[1];

  return (
    <span
      className={`badge-role badge-role-moderateur badge-mod-niveau-${niveau}`}
      style={{
        width: size,
        height: size,
        background: "transparent",
        boxShadow: `0 0 8px ${n.glow}`,
      }}
      title={n.title}
      aria-label={n.title}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Bouclier */}
        <path
          d="M12 22C12 22 20 18 20 11V5L12 2L4 5V11C4 18 12 22 12 22Z"
          fill={n.color}
          stroke={n.stroke}
          strokeWidth="0.5"
        />
        {/* Sabres croisés */}
        <path
          d="M9 8L15 14M15 8L9 14"
          stroke={n.stroke}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}