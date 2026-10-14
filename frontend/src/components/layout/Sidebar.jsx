import { NavLink, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FiShield, FiBookOpen, FiLogOut, FiSettings } from "react-icons/fi";
import Avatar from "../ui/Avatar";
import NomUtilisateur from "../ui/NomUtilisateur";
import Icon from "../ui/Icon";
import VersetSidebar from "./VersetSidebar";
import { useAuthStore } from "../../store/authStore";
import { compterSignalements } from "../../api/endpoints";
import { useConfirmation } from "../ui/Confirmation";

export default function Sidebar() {
  const profil = useAuthStore((s) => s.profil);
  const user = useAuthStore((s) => s.user);
  const deconnexion = useAuthStore((s) => s.deconnexion);
  const navigate = useNavigate();
  const confirmer = useConfirmation();
  const estAdmin = user?.role === "admin";
  const estModerateur = user?.role === "admin" || user?.role === "moderateur";

  const { data: compteurSignalements } = useQuery({
    queryKey: ["moderation-count"],
    queryFn: compterSignalements,
    enabled: estModerateur,
    refetchInterval: 30_000,
  });

  const nbSignalements = compteurSignalements?.ouverts || 0;


  async function handleLogout() {
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

  return (
    <aside className="side" aria-label="Raccourcis">
      <div className="logo logo-side">
        <img
          src="/media/logo/logo.png"
          alt="Emmaüs"
          className="logo-img"
        />
        <span className="logo-text">Emmaüs</span>
      </div>

      <button className="row mini-me" onClick={() => navigate("/moi")}>
        <Avatar profil={profil} size="sm" />
        <div>
          <NomUtilisateur profil={profil} taille="sm" />
          <small>Voir mon mur</small>
        </div>
      </button>

      <NavLink
        to="/decouvrir"
        className={({ isActive }) => `nb ${isActive ? "on" : ""}`}
      >
        <Icon name="users" />
        <span>Découvrir des profils</span>
      </NavLink>

      <NavLink
        to="/directs"
        className={({ isActive }) => `nb ${isActive ? "on" : ""}`}
      >
        <Icon name="live" />
        <span>Cultes en direct</span>
        <em>3</em>
      </NavLink>

      <NavLink
        to="/notifications"
        className={({ isActive }) => `nb ${isActive ? "on" : ""}`}
      >
        <Icon name="bell" />
        <span>Notifications</span>
      </NavLink>

      {/* Section admin (desktop) */}
      {estModerateur && (
        <>
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              color: "var(--mute)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              padding: "12px 16px 4px",
            }}
          >
            Administration
          </div>

          <NavLink
            to="/moderation"
            className={({ isActive }) => `nb ${isActive ? "on" : ""}`}
          >
            <FiShield size={20} />
            <span>Modération</span>
            {nbSignalements > 0 && <em className="badge-moderation">{nbSignalements}</em>}
          </NavLink>
          {estAdmin && (
            <NavLink
              to="/admin/moderateurs"
              className={({ isActive }) => `nb ${isActive ? "on" : ""}`}
            >
              <FiShield size={20} />
              <span>Modérateurs</span>
            </NavLink>
          )}

          {estAdmin && (
            <NavLink
              to="/admin/versets-sidebar"
              className={({ isActive }) => `nb ${isActive ? "on" : ""}`}
            >
              <FiBookOpen size={20} />
              <span>Versets bibliques</span>
            </NavLink>
          )}
        </>
      )}

      <NavLink
        to="/parametres"
        className={({ isActive }) => `nb ${isActive ? "on" : ""}`}
      >
        <FiSettings size={20} />
        <span>Paramètres</span>
      </NavLink>

      <button className="nb" onClick={handleLogout}>
        <FiLogOut size={20} />
        <span>Déconnexion</span>
      </button>

      <VersetSidebar />
    </aside>
  );
}
