import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FiX,
  FiLink,
  FiRepeat,
  FiCheck,
  FiMessageCircle,
  FiFacebook,
  FiTwitter,
  FiSend,
} from "react-icons/fi";
import { FaWhatsapp, FaTelegram, FaFacebook, FaTwitter } from "react-icons/fa";
import Avatar from "../ui/Avatar";
import { useToast } from "../ui/Toast";
import { useAuthStore } from "../../store/authStore";
import { repartager, verifierRepartage } from "../../api/endpoints";

const SITE_URL = window.location.origin;

function ModalPartage({ publication, onClose }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { afficher: afficherToast } = useToast();
  const profil = useAuthStore((s) => s.profil);
  const [texte, setTexte] = useState("");
  const [copie, setCopie] = useState(false);

  const lienPublication = `${SITE_URL}/publication/${publication.id}`;
  const textePartage = publication.texte?.slice(0, 100) || "Découvre cette publication sur Emmaüs";

  // Vérifier si déjà repartagé
  const { data: verifData } = useQuery({
    queryKey: ["repartage-verif", publication.id],
    queryFn: () => verifierRepartage(publication.id),
  });

  const dejaRepublie = verifData?.deja_republie;

  const repartagerMutation = useMutation({
    mutationFn: () => repartager(publication.id, texte.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fil"] });
      qc.invalidateQueries({ queryKey: ["mes-publications"] });
      qc.invalidateQueries({ queryKey: ["repartage-verif", publication.id] });
      afficherToast("La publication apparaît maintenant sur ton mur.", {
        type: "success",
        titre: "🔁 Republié",
      });
      onClose();
      setTimeout(() => navigate("/moi"), 300);
    },
    onError: (err) => {
      afficherToast(
        err.response?.data?.detail || "Erreur lors du repartage.",
        {
          type: "error",
          titre: "Erreur",
        }
      );
    },
  });

  async function copierLien() {
    try {
      await navigator.clipboard.writeText(lienPublication);
      setCopie(true);
      afficherToast("Le lien est dans ton presse-papiers.", {
        type: "success",
        titre: "🔗 Lien copié",
      });
      setTimeout(() => setCopie(false), 2000);
    } catch (e) {
      afficherToast("Impossible de copier le lien.", {
        type: "error",
        titre: "Erreur",
      });
    }
  }

  function partagerExterne(reseau) {
    const url = encodeURIComponent(lienPublication);
    const txt = encodeURIComponent(textePartage);
    const liens = {
      whatsapp: `https://wa.me/?text=${txt}%20${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      twitter: `https://twitter.com/intent/tweet?text=${txt}&url=${url}`,
      telegram: `https://t.me/share/url?url=${url}&text=${txt}`,
    };
    window.open(liens[reseau], "_blank", "noopener,noreferrer");
  }

  // Support Web Share API (mobile)
  async function partageNatif() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Emmaüs",
          text: textePartage,
          url: lienPublication,
        });
      } catch (e) {
        // Annulé par l'utilisateur
      }
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card partage-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h3>Partager</h3>
          <button className="modal-close" onClick={onClose} aria-label="Fermer">
            <FiX size={20} />
          </button>
        </div>

        <div className="partage-body">
          {/* Aperçu de la publication */}
          <div className="partage-apercu">
            <Avatar profil={publication.auteur} size="sm" />
            <div style={{ minWidth: 0, flex: 1 }}>
              <b>{publication.auteur?.nom_affiche}</b>
              <p className="partage-apercu-texte">
                {publication.texte?.slice(0, 80) || "(sans texte)"}
                {publication.texte?.length > 80 ? "…" : ""}
              </p>
            </div>
          </div>

          {/* Republier (comme un retweet) */}
          {!dejaRepublie && (
            <div className="partage-republier">
              <div className="partage-republier-header">
                <FiRepeat size={18} />
                <b>Republier sur ton mur</b>
              </div>
              <textarea
                value={texte}
                onChange={(e) => setTexte(e.target.value)}
                placeholder="Ajoute un commentaire (optionnel)…"
                rows={2}
                maxLength={280}
              />
              <button
                className="btn fl partage-republier-btn"
                onClick={() => repartagerMutation.mutate()}
                disabled={repartagerMutation.isPending}
              >
                <FiRepeat size={16} />
                {repartagerMutation.isPending ? "Repartage…" : "Republier"}
              </button>
            </div>
          )}

          {dejaRepublie && (
            <div className="partage-deja-republie">
              <FiCheck size={20} />
              <span>Tu as déjà republié cette publication.</span>
            </div>
          )}

          {/* Copier le lien */}
          <button
            className="partage-option"
            onClick={copierLien}
          >
            <div className="partage-option-icon partage-option-icon-lien">
              {copie ? <FiCheck size={20} /> : <FiLink size={20} />}
            </div>
            <div className="partage-option-texte">
              <b>{copie ? "Lien copié !" : "Copier le lien"}</b>
              <small>Partage-le où tu veux</small>
            </div>
          </button>

          {/* Réseaux sociaux */}
          <div className="partage-reseaux">
            <p className="partage-reseaux-titre">Envoyer vers…</p>
            <div className="partage-reseaux-grille">
              <button
                className="partage-reseau whatsapp"
                onClick={() => partagerExterne("whatsapp")}
                aria-label="WhatsApp"
              >
                <FaWhatsapp size={22} />
              </button>
              <button
                className="partage-reseau facebook"
                onClick={() => partagerExterne("facebook")}
                aria-label="Facebook"
              >
                <FaFacebook size={22} />
              </button>
              <button
                className="partage-reseau twitter"
                onClick={() => partagerExterne("twitter")}
                aria-label="X / Twitter"
              >
                <FaTwitter size={22} />
              </button>
              <button
                className="partage-reseau telegram"
                onClick={() => partagerExterne("telegram")}
                aria-label="Telegram"
              >
                <FaTelegram size={22} />
              </button>

              {/* Partage natif (mobile) */}
              {navigator.share && (
                <button
                  className="partage-reseau natif"
                  onClick={partageNatif}
                  aria-label="Plus d'options"
                >
                  <FiSend size={20} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PartageModal(props) {
  return createPortal(<ModalPartage {...props} />, document.body);
}
