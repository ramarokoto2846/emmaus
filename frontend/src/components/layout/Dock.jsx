import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  FiHome,
  FiUsers,
  FiMail,
  FiBell,
  FiPlus,
  FiFilm,
  FiEdit3,
  FiX,
} from "react-icons/fi";
import { compterNotifications, conversations } from "../../api/endpoints";

export default function Dock() {
  const navigate = useNavigate();
  const location = useLocation();
  const [visible, setVisible] = useState(true);
  const [popupOuverte, setPopupOuverte] = useState(false);
  const lastY = useRef(0);
  const ticking = useRef(false);

  const { data: notifs } = useQuery({
    queryKey: ["notifications-count"],
    queryFn: compterNotifications,
    refetchInterval: 30000,
  });

  const { data: convs } = useQuery({
    queryKey: ["conversations"],
    queryFn: conversations,
    refetchInterval: 30000,
  });

  const listeConvs = convs?.results || convs || [];
  const nonLusMessages = listeConvs.reduce(
    (acc, c) => acc + (c.non_lus || 0),
    0
  );
  const notifsNonLues = notifs?.non_lues || 0;

  useEffect(() => {
    const seuil = window.innerWidth <= 720 ? 15 : 10;

    function onScroll() {
      if (ticking.current) return;
      ticking.current = true;

      requestAnimationFrame(() => {
        const y = window.scrollY;
        const diff = y - lastY.current;

        if (y < 100) setVisible(true);
        else if (diff > seuil) setVisible(false);
        else if (diff < -seuil) setVisible(true);

        lastY.current = y;
        ticking.current = false;
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setVisible(true);
    setPopupOuverte(false);
  }, [location.pathname]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") setPopupOuverte(false);
    }
    if (popupOuverte) {
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }
  }, [popupOuverte]);

  const linkClass = ({ isActive }) => (isActive ? "on" : "");

  function choisirVideo() {
    setPopupOuverte(false);
    navigate("/video/publier");
  }

  function choisirStatut() {
    setPopupOuverte(false);
    navigate("/?composer=1");
  }

  const contenu = (
    <>
      <nav
        className={`dock ${visible ? "visible" : "cache"}`}
        aria-label="Navigation"
        style={{
          position: "fixed",
          bottom: "16px",
          left: "50%",
          transform: visible
            ? "translateX(-50%) translateY(0)"
            : "translateX(-50%) translateY(200%)",
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? "auto" : "none",
          zIndex: 99999,
        }}
      >
        <NavLink to="/" end className={linkClass}>
          <FiHome size={22} />
          <span>Accueil</span>
        </NavLink>

        <NavLink to="/decouvrir" className={linkClass}>
          <FiUsers size={22} />
          <span>Découvrir</span>
        </NavLink>

        <button
          className={`fab ${popupOuverte ? "actif" : ""}`}
          aria-label="Publier"
          onClick={() => setPopupOuverte((v) => !v)}
        >
          {popupOuverte ? <FiX size={24} /> : <FiPlus size={24} />}
        </button>

        <NavLink to="/messages" className={linkClass} aria-label="Messages">
          <FiMail size={22} />
          <span>Messages</span>
          {nonLusMessages > 0 && <i className="bd">{nonLusMessages}</i>}
        </NavLink>

        <NavLink
          to="/notifications"
          className={linkClass}
          aria-label="Notifications"
        >
          <FiBell size={22} />
          <span>Notifs</span>
          {notifsNonLues > 0 && <i className="bd">{notifsNonLues}</i>}
        </NavLink>
      </nav>

      {popupOuverte && (
        <div className="popup-overlay" onClick={() => setPopupOuverte(false)}>
          <div className="popup-publier" onClick={(e) => e.stopPropagation()}>
            <h3 className="popup-titre">Que veux-tu publier ?</h3>

            <button className="popup-choix" onClick={choisirVideo}>
              <div className="popup-choix-icon popup-choix-icon-video">
                <FiFilm size={26} />
              </div>
              <div className="popup-choix-texte">
                <b>Vidéo</b>
                <small>Prédication, témoignage, louange…</small>
              </div>
            </button>

            <button className="popup-choix" onClick={choisirStatut}>
              <div className="popup-choix-icon popup-choix-icon-statut">
                <FiEdit3 size={26} />
              </div>
              <div className="popup-choix-texte">
                <b>Statut</b>
                <small>Texte, prière, verset…</small>
              </div>
            </button>

            <button
              className="popup-annuler"
              onClick={() => setPopupOuverte(false)}
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </>
  );

  // ✅ PORTAL : rend le dock DIRECTEMENT dans document.body
  return createPortal(contenu, document.body);
}