import React from "react";

/**
 * Badge Administrateur style Discord avec couronne.
 * Dégradé or royal.
 */
const STYLE = {
  title: "Administrateur",
  color: "#D4A233",
  stroke: "#FFF4C2",
  glow: "rgba(212, 162, 51, 0.65)",
};

export default function BadgeAdmin({ size = 15 }) {
  return (
    <span
      className="badge-role badge-role-admin badge-admin-royal"
      style={{
        width: size,
        height: size,
        background: "transparent",
        boxShadow: `0 0 8px ${STYLE.glow}`,
      }}
      title={STYLE.title}
      aria-label={STYLE.title}
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
          fill={STYLE.color}
          stroke={STYLE.stroke}
          strokeWidth="0.5"
        />
        {/* Couronne dorée */}
        <path
          d="M7 13L7 9L9.5 10.5L12 7.5L14.5 10.5L17 9L17 13L7 13Z"
          fill={STYLE.stroke}
          stroke={STYLE.stroke}
          strokeWidth="0.3"
          strokeLinejoin="round"
        />
        {/* Petits points sur la couronne */}
        <circle cx="7" cy="9" r="0.7" fill={STYLE.color} />
        <circle cx="12" cy="7.5" r="0.7" fill={STYLE.color} />
        <circle cx="17" cy="9" r="0.7" fill={STYLE.color} />
      </svg>
    </span>
  );
}