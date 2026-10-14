import { useEffect, useState, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FiHome, FiUsers, FiMail, FiBell, FiPlus } from "react-icons/fi";
import { compterNotifications, conversations } from "../../api/endpoints";

export default function Dock() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(true);
  
  const lastY = useRef(0);

  const { data: notifs } = useQuery({
    queryKey: ["notifications-count"],
    queryFn: compterNotifications,
    refetchInterval: 30_000,
  });

  const { data: convs } = useQuery({
    queryKey: ["conversations"],
    queryFn: conversations,
    refetchInterval: 30_000,
  });

  const listeConvs = convs?.results || convs || [];
  const nonLusMessages = listeConvs.reduce(
    (acc, c) => acc + (c.non_lus || 0),
    0
  );
  const notifsNonLues = notifs?.non_lues || 0;

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      if (y < 80) {
        setVisible(true);
        lastY.current = y;
        return;
      }
      const diff = y - lastY.current;
      if (diff > 10) setVisible(false);
      else if (diff < -10) setVisible(true);
      lastY.current = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const linkClass = ({ isActive }) => (isActive ? "on" : "");

  return (
    <nav
      className={`dock ${visible ? "visible" : "cache"}`}
      aria-label="Navigation"
    >
      <NavLink to="/" end className={linkClass}>
        <FiHome size={20} />
        <span>Actualités</span>
      </NavLink>

      <NavLink to="/decouvrir" className={linkClass}>
        <FiUsers size={20} />
        <span>Découvrir</span>
      </NavLink>

      <button
        className="fab"
        aria-label="Publier"
        onClick={() => navigate("/video/publier")}
      >
        <FiPlus size={22} />
      </button>

      <NavLink to="/messages" className={linkClass} aria-label="Messages">
        <FiMail size={20} />
        <span>Messages</span>
        {nonLusMessages > 0 && <i className="bd">{nonLusMessages}</i>}
      </NavLink>

      <NavLink
        to="/notifications"
        className={linkClass}
        aria-label="Notifications"
      >
        <FiBell size={20} />
        <span>Notifs</span>
        {notifsNonLues > 0 && <i className="bd">{notifsNonLues}</i>}
      </NavLink>
          </nav>
  );
}
