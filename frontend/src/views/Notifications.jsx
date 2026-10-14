import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FiTrash2,
  FiCheck,
  FiX,
  FiChevronDown,
} from "react-icons/fi";
import Avatar from "../components/ui/Avatar";
import NomUtilisateur from "../components/ui/NomUtilisateur";
import Button from "../components/ui/Button";
import { useConfirmation } from "../components/ui/Confirmation";
import { useToast } from "../components/ui/Toast";
import {
  notifications,
  lireNotification,
  toutLireNotifications,
  supprimerNotification,
  toutSupprimerNotifications,
} from "../api/endpoints";
import { formatRelative } from "../utils/format";

const LIBELLES = {
  amen: "a mis un Amen à votre publication",
  commentaire: "a commenté votre publication",
  abonne: "s'est abonné à votre profil",
  direct: "a lancé un direct",
  priere: "a prié pour votre sujet",
  defi: "vous invite à un défi",
  message: "vous a envoyé un message",
  message_supprime: "a supprimé un message dans votre conversation",
  verset: "a partagé le verset du jour",
  partage: "a repartagé votre publication. Cliquez pour voir son partage.",
  signalement:
    "⚠️ Votre contenu a été signalé et est en cours d'examen. Cliquez pour le voir.",
  signalement_leve:
    "✅ Bonne nouvelle : votre contenu a été rétabli et est de nouveau public.",
  signalement_confirme:
    "🔒 Votre contenu a été confirmé comme non conforme.",
  suppression_contenu:
    "❌ Votre contenu a été supprimé par la modération.",
  promotion_moderateur:
    "🎉 Félicitations ! Tu es maintenant modérateur de la communauté Emmaüs. Tu peux désormais examiner les signalements et modérer les contenus.",
  retrogradation:
    "Malheureusement, ton rôle de modérateur a été retiré. Tu restes un membre précieux de la communauté.",
};

// Types qui pointent vers un contenu de l'utilisateur (à voir)
const TYPES_CONTENU = [
  "signalement",
  "signalement_leve",
  "signalement_confirme",
  "suppression_contenu",
  "partage",
];

export default function Notifications() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const confirmer = useConfirmation();
  const { afficher: afficherToast } = useToast();
  const [menuOuvert, setMenuOuvert] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["notifications-list"],
    queryFn: () => notifications(),
    refetchInterval: 30_000,
  });

  const lireMutation = useMutation({
    mutationFn: (id) => lireNotification(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications-list"] });
      qc.invalidateQueries({ queryKey: ["notifications-count"] });
    },
  });

  const toutLireMutation = useMutation({
    mutationFn: toutLireNotifications,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications-list"] });
      qc.invalidateQueries({ queryKey: ["notifications-count"] });
      afficherToast("Toutes les notifications sont marquées comme lues.", {
        type: "success",
        titre: "Notifications lues",
      });
    },
  });

  const supprMutation = useMutation({
    mutationFn: (id) => supprimerNotification(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications-list"] });
      qc.invalidateQueries({ queryKey: ["notifications-count"] });
      afficherToast("La notification a été supprimée.", {
        type: "success",
        titre: "Notification supprimée",
      });
    },
  });

  const toutSupprMutation = useMutation({
    mutationFn: toutSupprimerNotifications,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications-list"] });
      qc.invalidateQueries({ queryKey: ["notifications-count"] });
      afficherToast("Toutes les notifications ont été supprimées.", {
        type: "success",
        titre: "Notifications effacées",
      });
    },
  });

  const liste = data?.results || data || [];
  const nonLues = liste.filter((n) => !n.lu).length;

  function handleClick(n) {
    if (!n.lu) lireMutation.mutate(n.id);

    // Notification liée à un contenu (signalement, partage…)
    if (TYPES_CONTENU.includes(n.type)) {
      if (n.cible_type === "repartage") {
        // Pointe vers la publication du repartage
        navigate(`/publication/${n.cible_id}`);
      } else if (n.cible_type === "publication") {
        navigate(`/publication/${n.cible_id}`);
      } else if (n.cible_type === "video") {
        navigate(`/video/${n.cible_id}`);
      } else if (n.cible_type === "commentaire") {
        navigate(`/commentaire/${n.cible_id}`);
      }
      return;
    }

    // Autres notifications
    if (n.cible_type === "publication") navigate("/");
    else if (n.cible_type === "profil") navigate(`/profil/${n.cible_id}`);
    else if (n.cible_type === "message") navigate("/messages");
    else if (n.cible_type === "direct") navigate(`/direct/${n.cible_id}`);
  }

  async function supprimerUne(id, e) {
    e.stopPropagation();
    setMenuOuvert(null);
    const ok = await confirmer({
      titre: "Supprimer cette notification ?",
      message: "Cette action est définitive.",
      labelConfirmer: "Supprimer",
      danger: true,
    });
    if (ok) supprMutation.mutate(id);
  }

  async function toutSupprimer() {
    const ok = await confirmer({
      titre: "Supprimer toutes les notifications ?",
      message: `Les ${liste.length} notifications seront effacées définitivement.`,
      labelConfirmer: "Tout supprimer",
      danger: true,
    });
    if (ok) toutSupprMutation.mutate();
  }

  return (
    <>
      <div className="notifications-head">
        <div>
          <h1 className="vh">Notifications</h1>
          {nonLues > 0 && (
            <p className="sub">
              {nonLues} non lue{nonLues > 1 ? "s" : ""} sur {liste.length}
            </p>
          )}
        </div>

        <div className="notifications-actions">
          {nonLues > 0 && (
            <button
              className="btn alt"
              onClick={() => toutLireMutation.mutate()}
              disabled={toutLireMutation.isPending}
            >
              <FiCheck size={16} />
              Tout marquer lu
            </button>
          )}
          {liste.length > 0 && (
            <button
              className="btn danger"
              onClick={toutSupprimer}
              disabled={toutSupprMutation.isPending}
            >
              <FiTrash2 size={16} />
              Tout supprimer
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <p className="sub">Chargement…</p>
      ) : liste.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <p className="sub">Aucune notification.</p>
        </div>
      ) : (
        <div className="card notifications-list">
          {liste.map((n) => (
            <div
              key={n.id}
              className={`notification-item ${n.lu ? "" : "non-lu"}`}
              onClick={() => handleClick(n)}
            >
              <Avatar profil={n.acteur} size="sm" />

              <div className="notification-content">
                <div className="notification-text">
                  <NomUtilisateur profil={n.acteur} taille="sm" />{" "}
                  <span>{LIBELLES[n.type] || n.type}</span>
                </div>
                <div className="notification-time">
                  {formatRelative(n.cree_le)}
                </div>
              </div>

              {!n.lu && <span className="notification-dot" />}

              <div
                className="notification-menu"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="notification-menu-btn"
                  onClick={() =>
                    setMenuOuvert(menuOuvert === n.id ? null : n.id)
                  }
                  aria-label="Options"
                >
                  <FiChevronDown size={16} />
                </button>

                {menuOuvert === n.id && (
                  <div className="notification-menu-list">
                    {!n.lu && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          lireMutation.mutate(n.id);
                          setMenuOuvert(null);
                        }}
                      >
                        <FiCheck size={14} />
                        Marquer comme lu
                      </button>
                    )}
                    <button
                      onClick={(e) => supprimerUne(n.id, e)}
                      className="danger"
                    >
                      <FiTrash2 size={14} />
                      Supprimer
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
