import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FiMessageCircle,
  FiShare2,
  FiMoreHorizontal,
  FiBookmark,
  FiTrash2,
  FiFlag,
  FiEdit2,
  FiRepeat,
  FiCheckCircle,
  FiAlertTriangle,
} from "react-icons/fi";

import Avatar from "../ui/Avatar";
import NomUtilisateur from "../ui/NomUtilisateur";
import Signalement from "../ui/Signalement";
import { useConfirmation } from "../ui/Confirmation";
import { useToast } from "../ui/Toast";

import CommentairesModal from "./CommentairesModal";
import PartageModal from "./PartageModal";
import VideoCard from "./VideoCard";

import { useAuthStore } from "../../store/authStore";
import {
  amenPublication,
  supprimerPublication,
  enregistrerContenu,
  repartager,
} from "../../api/endpoints";
import { formatRelative } from "../../utils/format";

export default function Post({ publication, onOuvrirCommentaires }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const confirmer = useConfirmation();
  const { afficher: afficherToast } = useToast();
  const monProfil = useAuthStore((s) => s.profil);

  const [menuOuvert, setMenuOuvert] = useState(false);
  const [modaleCommentaires, setModaleCommentaires] = useState(false);
  const [modalePartage, setModalePartage] = useState(false);
  const [signalementOuvert, setSignalementOuvert] = useState(false);
  const [modaleModifVerifiee, setModaleModifVerifiee] = useState(false);

  const estMoi = publication.auteur?.id === monProfil?.id;
  const estRepartage =
    publication.type === "partage" && publication.publication_origine;
  const estVerifiee = publication.est_verifiee === true;

  /* ---- Amen ---- */
  const amenMutation = useMutation({
    mutationFn: () => amenPublication(publication.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fil"] });
      qc.invalidateQueries({ queryKey: ["publication", publication.id] });
      qc.invalidateQueries({ queryKey: ["mes-publications"] });
    },
  });

  /* ---- Enregistrer ---- */
  const enregistrerMutation = useMutation({
    mutationFn: () =>
      enregistrerContenu({
        cible_type: "publication",
        cible_id: publication.id,
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["enregistrements"] });
      qc.invalidateQueries({ queryKey: ["enregistrements-count"] });
      qc.invalidateQueries({ queryKey: ["publication", publication.id] });
      afficherToast(
        data?.enregistre
          ? "Publication enregistrée."
          : "Retiré des enregistrements.",
        {
          type: "success",
          titre: data?.enregistre ? "Enregistré" : "Retiré",
        }
      );
    },
  });

  /* ---- Repartager ---- */
  const repartagerMutation = useMutation({
    mutationFn: () => repartager(publication.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fil"] });
      qc.invalidateQueries({ queryKey: ["mes-publications"] });
      qc.invalidateQueries({ queryKey: ["publication", publication.id] });
      afficherToast("Publication repartagée sur ton mur.", {
        type: "success",
        titre: "Repartagé",
      });
    },
    onError: (err) => {
      const msg =
        err?.response?.data?.detail ||
        "Impossible de repartager cette publication.";
      afficherToast(msg, { type: "error", titre: "Erreur" });
    },
  });

  /* ---- Supprimer ---- */
  async function supprimer() {
    setMenuOuvert(false);
    const ok = await confirmer({
      titre: "Supprimer cette publication ?",
      message: publication.video
        ? "La publication ET la vidéo associée seront définitivement supprimées."
        : "Cette action est définitive.",
      labelConfirmer: "Supprimer",
      danger: true,
    });
    if (!ok) return;
    try {
      await supprimerPublication(publication.id);
      qc.invalidateQueries({ queryKey: ["fil"] });
      qc.invalidateQueries({ queryKey: ["mes-publications"] });
      afficherToast("Publication supprimée.", {
        type: "success",
        titre: "Supprimée",
      });
    } catch {
      afficherToast("Erreur lors de la suppression.", {
        type: "error",
        titre: "Erreur",
      });
    }
  }

  /* ---- Modifier ---- */
  function modifier() {
    setMenuOuvert(false);
    if (estVerifiee) {
      setModaleModifVerifiee(true);
    } else {
      navigate(`/publication/${publication.id}/modifier`);
    }
  }

  function confirmerModifVerifiee() {
    setModaleModifVerifiee(false);
    navigate(`/publication/${publication.id}/modifier`);
  }

  /* ---- Commentaires ---- */
  function ouvrirCommentaires() {
    if (onOuvrirCommentaires) {
      onOuvrirCommentaires();
    } else {
      setModaleCommentaires(true);
    }
  }

  function allerProfil(id) {
    if (id) navigate(`/profil/${id}`);
  }

  function allerPublication(id) {
    if (id) navigate(`/publication/${id}`);
  }

  /* ============================================================
     Rendu du menu OU du badge
     ============================================================ */
  function renderMenuOuBadge() {
    // --- Cas 1 : Publication VÉRIFIÉE ---
    if (estVerifiee) {
      if (estMoi) {
        return (
          <div
            className="post-header-actions"
            onClick={(e) => e.stopPropagation()}
          >
            <span
              className="badge-verifie"
              title="Contenu vérifié par la modération"
            >
              <FiCheckCircle size={14} /> Vérifié
            </span>
            <div className="post-menu">
              <button
                className="more"
                onClick={() => setMenuOuvert(!menuOuvert)}
                aria-label="Options"
              >
                <FiMoreHorizontal size={18} />
              </button>
              {menuOuvert && (
                <div className="post-menu-list">
                  <button onClick={modifier}>
                    <FiEdit2 size={14} /> Modifier
                  </button>
                  <button onClick={supprimer} className="danger">
                    <FiTrash2 size={14} /> Supprimer
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      }
      return (
        <span
          className="badge-verifie"
          title="Contenu vérifié par la modération"
        >
          <FiCheckCircle size={14} /> Vérifié
        </span>
      );
    }

    // --- Cas 2 : Publication NON VÉRIFIÉE → menu normal ---
    return (
      <div className="post-menu" onClick={(e) => e.stopPropagation()}>
        <button
          className="more"
          onClick={() => setMenuOuvert(!menuOuvert)}
          aria-label="Options"
        >
          <FiMoreHorizontal size={18} />
        </button>
        {menuOuvert && (
          <div className="post-menu-list">
            {estMoi ? (
              <>
                {/* ✅ Modifier remplace Voir */}
                <button onClick={modifier}>
                  <FiEdit2 size={14} /> Modifier
                </button>
                <button onClick={supprimer} className="danger">
                  <FiTrash2 size={14} /> Supprimer
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setSignalementOuvert(true);
                  setMenuOuvert(false);
                }}
                className="danger"
              >
                <FiFlag size={14} /> Signaler
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <article className={`card post ${estRepartage ? "post-repartage" : ""}`}>
        {estRepartage && (
          <div className="fb-partage-indicateur">
            <FiRepeat size={14} />
            <span>
              <b>{publication.auteur?.nom_affiche}</b> a repartagé
            </span>
          </div>
        )}

        <header className="ph">
          <button
            onClick={() => allerProfil(publication.auteur?.id)}
            style={{ flex: "none" }}
            aria-label="Voir le profil"
          >
            <Avatar profil={publication.auteur} size="sm" />
          </button>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <NomUtilisateur profil={publication.auteur} taille="sm" />
            </div>
            <small>{formatRelative(publication.cree_le)}</small>
          </div>

          {renderMenuOuBadge()}
        </header>

        {publication.texte && (
          <p style={{ margin: "12px 0", whiteSpace: "pre-wrap" }}>
            {publication.texte}
          </p>
        )}

        {publication.video && (
          <div className="vid-bloc">
            <VideoCard video={publication.video} index={0} aspect="16/9" />
          </div>
        )}

        {publication.verset && (
          <div className="fb-embed-verset">
            <div className="fb-embed-verset-ref">
              <span>📖 {publication.verset.reference}</span>
            </div>
            <p>{publication.verset.texte}</p>
          </div>
        )}

        {estRepartage && (
          <div
            className="fb-embed"
            onClick={() => allerPublication(publication.publication_origine.id)}
          >
            <div className="fb-embed-header">
              <Avatar
                profil={publication.publication_origine.auteur}
                size="sm"
              />
              <div className="fb-embed-header-info">
                <b>{publication.publication_origine.auteur?.nom_affiche}</b>
                <small>
                  {formatRelative(publication.publication_origine.cree_le)}
                </small>
              </div>
            </div>

            {publication.publication_origine.texte && (
              <p className="fb-embed-texte">
                {publication.publication_origine.texte}
              </p>
            )}

            {publication.publication_origine.video && (
              <div className="fb-embed-media">
                <VideoCard
                  video={publication.publication_origine.video}
                  index={1}
                  aspect="16/9"
                />
              </div>
            )}

            {publication.publication_origine.verset && (
              <div className="fb-embed-verset">
                <div className="fb-embed-verset-ref">
                  <span>
                    📖 {publication.publication_origine.verset.reference}
                  </span>
                </div>
                <p>{publication.publication_origine.verset.texte}</p>
              </div>
            )}
          </div>
        )}

        <div className="acts">
          <button
            className={publication.est_amen ? "on" : ""}
            onClick={() => amenMutation.mutate()}
            disabled={amenMutation.isPending}
            aria-label="Amen"
          >
            <svg className="i">
              <use href="#flame" />
            </svg>
            <span>{publication.nb_amen || 0}</span>
          </button>

          <button onClick={ouvrirCommentaires} aria-label="Commenter">
            <FiMessageCircle size={18} />
            <span>{publication.nb_commentaires || 0}</span>
          </button>

          <button onClick={() => setModalePartage(true)} aria-label="Partager">
            <FiShare2 size={18} />
            <span>{publication.nb_partages || 0}</span>
          </button>

          <button
            className={`sv ${publication.est_enregistree ? "on" : ""}`}
            onClick={() => enregistrerMutation.mutate()}
            disabled={enregistrerMutation.isPending}
            aria-label="Enregistrer"
          >
            <FiBookmark size={18} />
          </button>

          <button
            onClick={() => repartagerMutation.mutate()}
            disabled={repartagerMutation.isPending}
            aria-label="Repartager"
            title="Repartager sur mon mur"
          >
            <FiRepeat size={18} />
          </button>
        </div>
      </article>

      {modaleCommentaires && (
        <CommentairesModal
          publication={publication}
          onClose={() => setModaleCommentaires(false)}
        />
      )}

      {modalePartage && (
        <PartageModal
          publication={publication}
          onClose={() => setModalePartage(false)}
        />
      )}

      {signalementOuvert && (
        <Signalement
          cibleType="publication"
          cibleId={publication.id}
          onClose={() => setSignalementOuvert(false)}
        />
      )}

      {modaleModifVerifiee && (
        <div
          className="modal-overlay"
          onClick={() => setModaleModifVerifiee(false)}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 480 }}
          >
            <div className="modal-head">
              <h3
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <FiAlertTriangle size={20} style={{ color: "var(--flame)" }} />
                Modifier une publication vérifiée ?
              </h3>
              <button
                className="modal-close"
                onClick={() => setModaleModifVerifiee(false)}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
            <div className="modal-body" style={{ padding: "20px 24px" }}>
              <div
                style={{
                  background: "rgba(212, 162, 51, 0.12)",
                  border: "1px solid rgba(212, 162, 51, 0.3)",
                  borderRadius: 14,
                  padding: 16,
                  marginBottom: 16,
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                }}
              >
                <FiAlertTriangle
                  size={20}
                  style={{ color: "var(--flame)", flex: "none", marginTop: 2 }}
                />
                <div>
                  <b style={{ display: "block", marginBottom: 6 }}>
                    Tu vas perdre le badge « Vérifié »
                  </b>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      color: "var(--mute)",
                      lineHeight: 1.5,
                    }}
                  >
                    Cette publication a été examinée et approuvée par un
                    modérateur. Si tu la modifies, elle devra être signalée et
                    réexaminée avant de récupérer son badge.
                  </p>
                </div>
              </div>

              <p
                style={{
                  fontSize: 14.5,
                  lineHeight: 1.5,
                  color: "var(--ink)",
                  marginBottom: 4,
                }}
              >
                Veux-tu vraiment la modifier ?
              </p>
            </div>
            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
                padding: "12px 24px 20px",
                borderTop: "1px solid var(--line)",
              }}
            >
              <button
                className="btn alt"
                onClick={() => setModaleModifVerifiee(false)}
              >
                Annuler
              </button>
              <button className="btn fl" onClick={confirmerModifVerifiee}>
                <FiEdit2 size={14} /> Modifier quand même
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}