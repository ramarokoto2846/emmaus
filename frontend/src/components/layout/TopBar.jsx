import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  FiSearch,
  FiLogOut,
  FiSun,
  FiMoon,
  FiCircle,
  FiShield,
  FiBookOpen,
  FiUser,
  FiSettings,
} from "react-icons/fi";
import VersetSidebar from "./VersetSidebar";
import { useAuthStore } from "../../store/authStore";
import { useConfirmation } from "../ui/Confirmation";

export default function TopBar() {
  const [q, setQ] = useState("");
  const [theme, setTheme] = useState(
    document.documentElement.dataset.theme || "auto"
  );
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [estMobile, setEstMobile] = useState(
    typeof window !== "undefined" && window.innerWidth <= 1100
  );

  const navigate = useNavigate();
  const deconnexion = useAuthStore((s) => s.deconnexion);
  const user = useAuthStore((s) => s.user);
  const profil = useAuthStore((s) => s.profil);
  const confirmer = useConfirmation();
  const avatarRef = useRef(null);

  const estAdmin = user?.role === "admin";
  const estModerateur = user?.role === "admin" || user?.role === "moderateur";

  useEffect(() => {
    function onResize() {
      setEstMobile(window.innerWidth <= 1100);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "auto") delete root.dataset.theme;
    else root.dataset.theme = theme;
  }, [theme]);

  // Calculer la position du menu quand il s'ouvre
  useEffect(() => {
    if (menuOuvert && avatarRef.current) {
      const rect = avatarRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [menuOuvert]);

  // Fermer au clic extérieur + au scroll
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        avatarRef.current &&
        !avatarRef.current.contains(e.target) &&
        !e.target.closest(".top-menu-portal")
      ) {
        setMenuOuvert(false);
      }
    }
    function handleScroll() {
      setMenuOuvert(false);
    }
    if (menuOuvert) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("scroll", handleScroll, { passive: true });
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        window.removeEventListener("scroll", handleScroll);
      };
    }
  }, [menuOuvert]);

  function cycleTheme() {
    setTheme((t) =>
      t === "auto" ? "light" : t === "light" ? "dark" : "auto"
    );
  }

  function onSearch(e) {
    e.preventDefault();
    const v = q.trim();
    if (v.length >= 2) {
      navigate(`/recherche?q=${encodeURIComponent(v)}`);
    }
  }

  async function handleLogout() {
    setMenuOuvert(false);
    const ok = await confirmer({
      titre: "Se déconnecter ?",
      message: "Tu devras te reconnecter pour accéder à Emmaüs.",
      labelConfirmer: "Se déconnecter",
      labelAnnuler: "Annuler",
      danger: true,
    });
    if (ok) {
      deconnexion();
      navigate("/login");
    }
  }

  function goTo(path) {
    setMenuOuvert(false);
    navigate(path);
  }

  // Le menu à afficher dans le portal
  const menuContent = menuOuvert ? (
    <div
      className="top-menu-portal"
      style={{
        position: "fixed",
        top: menuPos.top,
        right: menuPos.right,
        zIndex: 99999,
        minWidth: 240,
        maxWidth: "calc(100vw - 24px)",
        background: "var(--surf)",
        border: "1px solid var(--line)",
        borderRadius: 18,
        padding: 8,
        boxShadow:
          "0 4px 12px rgba(60, 10, 25, 0.06), 0 20px 50px rgba(60, 10, 25, 0.18)",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <div className="top-menu-profil">
        <div className="top-menu-avatar">
          {profil?.avatar || profil?.avatar_url ? (
            <img
              src={profil.avatar || profil.avatar_url}
              alt={profil.nom_affiche}
            />
          ) : (
            <span>{profil?.initiales || "?"}</span>
          )}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <b
            style={{
              display: "block",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {profil?.nom_affiche || user?.pseudo}
          </b>
          <span className="sub" style={{ fontSize: 12.5 }}>
            @{user?.pseudo}
          </span>
        </div>
      </div>

      <div className="top-menu-sep" />

      <button onClick={() => goTo("/moi")}>
        <FiUser size={16} />
        <span>Mon mur</span>
      </button>

      <button onClick={() => goTo("/parametres")}>
        <FiSettings size={16} />
        <span>Paramètres</span>
      </button>

      {estModerateur && (
        <>
          <div className="top-menu-sep" />
          <div className="top-menu-header">
            <FiShield size={14} />
            <span>Administration</span>
          </div>
          <button onClick={() => goTo("/moderation")}>
            <FiShield size={16} />
            <span>Modération</span>
          </button>
          {estAdmin && (
            <button onClick={() => goTo("/admin/versets-sidebar")}>
              <FiBookOpen size={16} />
              <span>Versets bibliques</span>
            </button>
          )}
        </>
      )}

      <div className="top-menu-sep" />

      <button onClick={handleLogout} className="danger">
        <FiLogOut size={16} />
        <span>Déconnexion</span>
      </button>
    </div>
  ) : null;

  return (
    <>
      <div className="top">
        {/* MOBILE */}
        {estMobile ? (
          <>
            <div className="top-logo-mobile">Emmaüs</div>

            <form className="search" onSubmit={onSearch}>
              <FiSearch size={18} />
              <input
                placeholder="Chercher…"
                aria-label="Rechercher"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </form>

            <button
              className="ic-round"
              onClick={cycleTheme}
              aria-label="Changer le thème"
            >
              {theme === "dark" ? (
                <FiMoon size={20} />
              ) : theme === "light" ? (
                <FiSun size={20} />
              ) : (
                <FiCircle size={18} />
              )}
            </button>

            <button
              ref={avatarRef}
              className={`ic-round ic-avatar ${menuOuvert ? "actif" : ""}`}
              onClick={() => setMenuOuvert((v) => !v)}
              aria-label="Menu utilisateur"
            >
              {profil?.avatar || profil?.avatar_url ? (
                <img
                  src={profil.avatar || profil.avatar_url}
                  alt={profil.nom_affiche}
                />
              ) : (
                <span className="ic-initiales">
                  {profil?.initiales || "?"}
                </span>
              )}
            </button>
          </>
        ) : (
          /* DESKTOP */
          <>
            <form className="search" onSubmit={onSearch}>
              <FiSearch size={18} />
              <input
                placeholder="Chercher une prédication, un pasteur, une église"
                aria-label="Rechercher"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </form>

            <button
              className="ic-round"
              onClick={cycleTheme}
              aria-label="Changer le thème"
              title={`Thème : ${theme}`}
            >
              {theme === "dark" ? (
                <FiMoon size={20} />
              ) : theme === "light" ? (
                <FiSun size={20} />
              ) : (
                <FiCircle size={18} />
              )}
            </button>
          </>
        )}
      </div>

      {/* PORTAL : le menu est rendu à la racine du DOM */}
      {menuContent && createPortal(menuContent, document.body)}
    </>
  );
}
