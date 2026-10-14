import { useEffect } from "react";

/**
 * Sprite SVG des icônes (comme dans la maquette)
 */
export function IconSprite() {
  return (
    <svg
      width="0"
      height="0"
      style={{ position: "absolute" }}
      aria-hidden="true"
    >
      <symbol id="home" viewBox="0 0 24 24">
        <path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
      </symbol>
      <symbol id="users" viewBox="0 0 24 24">
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20c0-2.8-1.7-4.8-4-5.6" />
      </symbol>
      <symbol id="user" viewBox="0 0 24 24">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4.5 3.5-7 8-7s8 2.5 8 7" />
      </symbol>
      <symbol id="live" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="2.5" />
        <path d="M7.5 7.5a6.4 6.4 0 0 0 0 9M16.5 7.5a6.4 6.4 0 0 1 0 9M4.5 4.5a10.6 10.6 0 0 0 0 15M19.5 4.5a10.6 10.6 0 0 1 0 15" />
      </symbol>
      <symbol id="bell" viewBox="0 0 24 24">
        <path d="M6 17V11a6 6 0 0 1 12 0v6l2 2H4zM10 21h4" />
      </symbol>
      <symbol id="search" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-4-4" />
      </symbol>
      <symbol id="flame" viewBox="0 0 24 24">
        <path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-4-1-6 2-10.5z" />
      </symbol>
      <symbol id="chat" viewBox="0 0 24 24">
        <path d="M21 12a8 8 0 0 1-11.8 7L4 20.5 5.5 16A8 8 0 1 1 21 12z" />
      </symbol>
      <symbol id="share" viewBox="0 0 24 24">
        <path d="M4 12v7h16v-7M12 3v12M7.5 7.5L12 3l4.5 4.5" />
      </symbol>
      <symbol id="mark" viewBox="0 0 24 24">
        <path d="M6 3h12v18l-6-4.5L6 21z" />
      </symbol>
      <symbol id="tri" viewBox="0 0 24 24">
        <path d="M6 3l15 9-15 9z" />
      </symbol>
      <symbol id="book" viewBox="0 0 24 24">
        <path d="M4 4h7a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4zM20 4h-7v16a2 2 0 0 1 2-2h5z" />
      </symbol>
      <symbol id="more" viewBox="0 0 24 24">
        <circle cx="5" cy="12" r="1" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
      </symbol>
      <symbol id="plus" viewBox="0 0 24 24">
        <path d="M12 5v14M5 12h14" />
      </symbol>
      <symbol id="mail" viewBox="0 0 24 24">
        <path d="M3 6h18v12H3zM3.5 7l8.5 6.5L20.5 7" />
      </symbol>
    </svg>
  );
}

export default function Icon({ name, className = "i" }) {
  return (
    <svg className={className}>
      <use href={`#${name}`} />
    </svg>
  );
}
