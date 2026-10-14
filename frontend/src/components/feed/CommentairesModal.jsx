import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  FiX,
  FiSend,
  FiTrash2,
  FiEdit2,
  FiMoreHorizontal,
  FiFlag,
  FiCornerDownRight,
} from "react-icons/fi";
import Avatar from "../ui/Avatar";
import NomUtilisateur from "../ui/NomUtilisateur";
import Signalement from "../ui/Signalement";
import { useConfirmation } from "../ui/Confirmation";
import { useToast } from "../ui/Toast";
import { useAuthStore } from "../../store/authStore";
import {
  commentaires,
  creerCommentaire,
  majCommentaire,
  supprimerCommentaire,
} from "../../api/endpoints";
import { formatRelative } from "../../utils/format";

export default function CommentairesModal({ publication, onClose }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const confirmer = useConfirmation();
  const { afficher: afficherToast } = useToast();
  const monProfil = useAuthStore((s) => s.profil);

  const [texte, setTexte] = useState("");
  const [reponseA, setReponseA] = useState(null);
  const [editionId, setEditionId] = useState(null);
  const [texteEdition, setTexteEdition] = useState("");
  const [signalementCible, setSignalementCible] = useState(null);
  const [menuOuvertId, setMenuOuvertId] = useState(null);
  const listeRef = useRef(null);

  const { data, isLoading } = useQuery({
    queryKey: ["commentaires", publication.id],
    queryFn: () =>
      commentaires({
        cible_type: "publication",
        cible_id: publication.id,
      }),
  });

  const creerMutation = useMutation({
    mutationFn: ({ text, parent }) =>
      creerCommentaire({
        cible_type: "publication",
        cible_id: publication.id,
        parent: parent || null,
        texte: text,
      }),
    onSuccess: () => {
      setTexte("");
      setReponseA(null);
      qc.invalidateQueries({ queryKey: ["commentaires", publication.id] });
      qc.invalidateQueries({ queryKey: ["fil"] });
      qc.invalidateQueries({ queryKey: ["mes-publications"] });
    },
  });

  const majMutation = useMutation({
    mutationFn: ({ id, texte }) => majCommentaire(id, { texte }),
    onSuccess: () => {
      setEditionId(null);
      setTexteEdition("");
      qc.invalidateQueries({ queryKey: ["commentaires", publication.id] });
      afficherToast("Ton commentaire a été modifié.", {
        type: "success",
        titre: "Commentaire modifié",
      });
    },
  });

  const supprMutation = useMutation({
    mutationFn: (id) => supprimerCommentaire(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commentaires", publication.id] });
      qc.invalidateQueries({ queryKey: ["fil"] });
      afficherToast("Ton commentaire a été supprimé.", {
        type: "success",
        titre: "Commentaire supprimé",
      });
    },
  });

  useEffect(() => {
    if (listeRef.current) {
      listeRef.current.scrollTop = listeRef.current.scrollHeight;
    }
  }, [data]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Fermer le menu au clic extérieur
  useEffect(() => {
    function onClick() {
      setMenuOuvertId(null);
    }
    if (menuOuvertId) {
      document.addEventListener("click", onClick);
      return () => document.removeEventListener("click", onClick);
    }
  }, [menuOuvertId]);

  // --- Actions partagées (utilisables pour les commentaires ET les réponses) ---

  function commencerEdition(c) {
    setEditionId(c.id);
    setTexteEdition(c.texte);
    setMenuOuvertId(null);
  }

  function validerEdition() {
    const t = texteEdition.trim();
    if (!t) return;
    majMutation.mutate({ id: editionId, texte: t });
  }

  function annulerEdition() {
    setEditionId(null);
    setTexteEdition("");
  }

  async function supprimer(id) {
    const ok = await confirmer({
      titre: "Supprimer ce commentaire ?",
      message: "Cette action est définitive.",
      labelConfirmer: "Supprimer",
      danger: true,
    });
    if (ok) supprMutation.mutate(id);
  }

  function commencerReponse(c) {
    setReponseA(c);
    setTimeout(
      () => document.querySelector(".commentaires-form input")?.focus(),
      100
    );
  }

  function signaler(id) {
    setSignalementCible({ id });
    setMenuOuvertId(null);
  }

  function envoyer(e) {
    e.preventDefault();
    const t = texte.trim();
    if (!t) return;
    creerMutation.mutate({ text: t, parent: reponseA?.id });
  }

  // Callbacks communs à passer à chaque Commentaire (récursif)
  const callbacks = {
    monProfil,
    editionId,
    texteEdition,
    setTexteEdition,
    onEdition: commencerEdition,
    onValiderEdition: validerEdition,
    onAnnulerEdition: annulerEdition,
    onSupprimer: supprimer,
    onRepondre: commencerReponse,
    onSignaler: signaler,
    menuOuvertId,
    setMenuOuvertId,
    onNavigate: navigate,
  };

  const liste = data?.results || data || [];

  const modal = (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card commentaires-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h3>Commentaires</h3>
          <button className="modal-close" onClick={onClose} aria-label="Fermer">
            <FiX size={20} />
          </button>
        </div>

        {/* Aperçu publication */}
        <div className="commentaires-publication">
          <Avatar profil={publication.auteur} size="sm" />
          <div style={{ minWidth: 0, flex: 1 }}>
            <b>{publication.auteur?.nom_affiche}</b>
            <div className="sub" style={{ fontSize: 13 }}>
              {publication.texte?.slice(0, 120)}
              {publication.texte?.length > 120 ? "…" : ""}
            </div>
          </div>
        </div>

        {/* Liste */}
        <div className="commentaires-liste" ref={listeRef}>
          {isLoading ? (
            <p className="sub" style={{ textAlign: "center", padding: 20 }}>
              Chargement…
            </p>
          ) : liste.length === 0 ? (
            <p className="sub" style={{ textAlign: "center", padding: 20 }}>
              Aucun commentaire. Sois le premier !
            </p>
          ) : (
            liste.map((c) => (
              <Commentaire key={c.id} commentaire={c} {...callbacks} />
            ))
          )}
        </div>

        {/* Bandeau de réponse */}
        {reponseA && (
          <div className="commentaires-reponse-info">
            <FiCornerDownRight size={14} />
            <span>
              Réponse à <b>{reponseA.auteur?.nom_affiche}</b>
            </span>
            <button onClick={() => setReponseA(null)} aria-label="Annuler">
              <FiX size={14} />
            </button>
          </div>
        )}

        {/* Formulaire */}
        <form className="commentaires-form" onSubmit={envoyer}>
          <Avatar profil={monProfil} size="sm" />
          <input
            type="text"
            placeholder={
              reponseA
                ? `Répondre à ${reponseA.auteur?.nom_affiche}…`
                : "Écris un commentaire…"
            }
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            autoFocus
            disabled={creerMutation.isPending}
          />
          <button
            type="submit"
            className="btn"
            disabled={!texte.trim() || creerMutation.isPending}
            aria-label="Envoyer"
          >
            <FiSend size={16} />
          </button>
        </form>
      </div>

      {/* Modal signalement */}
      {signalementCible && (
        <Signalement
          cibleType="commentaire"
          cibleId={signalementCible.id}
          onClose={() => setSignalementCible(null)}
        />
      )}
    </div>
  );

  return createPortal(modal, document.body);
}

function Commentaire({
  commentaire,
  monProfil,
  editionId,
  texteEdition,
  setTexteEdition,
  onEdition,
  onValiderEdition,
  onAnnulerEdition,
  onSupprimer,
  onRepondre,
  onSignaler,
  menuOuvertId,
  setMenuOuvertId,
  onNavigate,
}) {
  const estMoi = monProfil?.id && commentaire.auteur?.id === monProfil.id;
  const enEdition = editionId === commentaire.id;
  const menuOuvert = menuOuvertId === commentaire.id;
  const aDesReponses =
    commentaire.reponses && commentaire.reponses.length > 0;

  return (
    <div className="commentaire-bloc">
      <div className="commentaire">
        <button
          onClick={() =>
            commentaire.auteur?.id &&
            onNavigate(`/profil/${commentaire.auteur.id}`)
          }
          style={{ flex: "none" }}
        >
          <Avatar profil={commentaire.auteur} size="sm" />
        </button>

        <div className="commentaire-corps">
          {enEdition ? (
            <div className="commentaire-edition">
              <input
                type="text"
                value={texteEdition}
                onChange={(e) => setTexteEdition(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") onValiderEdition();
                  if (e.key === "Escape") onAnnulerEdition();
                }}
              />
              <div className="commentaire-edition-actions">
                <button className="btn alt" onClick={onAnnulerEdition}>
                  Annuler
                </button>
                <button className="btn" onClick={onValiderEdition}>
                  Enregistrer
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="commentaire-bulle">
                <NomUtilisateur profil={commentaire.auteur} taille="sm" />
                <span>{commentaire.texte}</span>
              </div>
              <div className="commentaire-meta">
                <span>{formatRelative(commentaire.cree_le)}</span>
                <button
                  className="commentaire-lien"
                  onClick={() => onRepondre(commentaire)}
                >
                  Répondre
                </button>
              </div>
            </>
          )}
        </div>

        {/* Menu 3 points — MODIFIER/SUPPRIMER si moi, SIGNALER sinon */}
        {!enEdition && (
          <div
            className="commentaire-menu"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="commentaire-menu-btn"
              onClick={() =>
                setMenuOuvertId(menuOuvert ? null : commentaire.id)
              }
              aria-label="Options"
            >
              <FiMoreHorizontal size={16} />
            </button>

            {menuOuvert && (
              <div className="commentaire-menu-list">
                {estMoi ? (
                  <>
                    <button onClick={() => onEdition(commentaire)}>
                      <FiEdit2 size={14} /> Modifier
                    </button>
                    <button
                      onClick={() => onSupprimer(commentaire.id)}
                      className="danger"
                    >
                      <FiTrash2 size={14} /> Supprimer
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => onSignaler(commentaire.id)}
                    className="danger"
                  >
                    <FiFlag size={14} /> Signaler
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Réponses imbriquées — récursif avec les MÊMES callbacks */}
      {aDesReponses && (
        <div className="commentaire-reponses">
          {commentaire.reponses.map((r) => (
            <Commentaire
              key={r.id}
              commentaire={r}
              monProfil={monProfil}
              editionId={editionId}
              texteEdition={texteEdition}
              setTexteEdition={setTexteEdition}
              onEdition={onEdition}
              onValiderEdition={onValiderEdition}
              onAnnulerEdition={onAnnulerEdition}
              onSupprimer={onSupprimer}
              onRepondre={onRepondre}
              onSignaler={onSignaler}
              menuOuvertId={menuOuvertId}
              setMenuOuvertId={setMenuOuvertId}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}