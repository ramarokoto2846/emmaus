import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

/* ============================================================
   APLATISSEMENT : chaque mère garde ses réponses
   ============================================================ */
function aplatirCommentaires(liste) {
  const groupes = [];

  function collecterReponses(commentaire, bucket) {
    if (commentaire.reponses && commentaire.reponses.length > 0) {
      for (const r of commentaire.reponses) {
        bucket.push(r);
        collecterReponses(r, bucket);
      }
    }
  }

  for (const c of liste) {
    const reponses = [];
    collecterReponses(c, reponses);
    groupes.push({ mere: c, reponses });
  }

  return groupes;
}

/* ============================================================
   RENDU DES MENTIONS @pseudo
   ============================================================ */
function rendreMentions(texte, profils = []) {
  if (!texte) return null;

  const pseudos = (profils || [])
    .map((p) => p.pseudo || p.utilisateur?.pseudo || p.nom_affiche)
    .filter(Boolean);

  let regex;
  if (pseudos.length === 0) {
    regex = /@([\w\u00C0-\u017F.-]+)/g;
  } else {
    const escaped = pseudos
      .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|");
    regex = new RegExp(`@(${escaped})`, "g");
  }

  return surlignerRegex(texte, regex);
}

function surlignerRegex(texte, regex) {
  const parties = [];
  let dernierIndex = 0;
  let match;

  while ((match = regex.exec(texte)) !== null) {
    if (match.index > dernierIndex) {
      parties.push(texte.slice(dernierIndex, match.index));
    }
    parties.push(
      <span key={`${match.index}-${match[0]}`} className="mention">
        {match[0]}
      </span>
    );
    dernierIndex = match.index + match[0].length;
  }

  if (dernierIndex < texte.length) {
    parties.push(texte.slice(dernierIndex));
  }

  return parties.length > 0 ? parties : texte;
}

/* ============================================================
   COMPOSANT PRINCIPAL
   ============================================================ */
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

  useEffect(() => {
    function onClick() {
      setMenuOuvertId(null);
    }
    if (menuOuvertId) {
      document.addEventListener("click", onClick);
      return () => document.removeEventListener("click", onClick);
    }
  }, [menuOuvertId]);

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
    listeProfils: data?.profils_mentionnables || [],
  };

  const liste = data?.results || data || [];
  const groupes = useMemo(() => aplatirCommentaires(liste), [liste]);

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
            groupes.map(({ mere, reponses }) => (
              <div key={mere.id} className="commentaire-groupe">
                <Commentaire
                  commentaire={mere}
                  estReponse={false}
                  {...callbacks}
                />

                {reponses.length > 0 && (
                  <div className="commentaires-reponses-groupe">
                    {reponses.map((r) => (
                      <Commentaire
                        key={r.id}
                        commentaire={r}
                        estReponse={true}
                        {...callbacks}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

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

/* ============================================================
   COMPOSANT COMMENTAIRE
   ✅ Menu 3 points rendu via PORTAL pour ne pas être coupé
   ============================================================ */
function Commentaire({
  commentaire,
  estReponse = false,
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
  listeProfils = [],
}) {
  const estMoi = monProfil?.id && commentaire.auteur?.id === monProfil.id;
  const enEdition = editionId === commentaire.id;
  const menuOuvert = menuOuvertId === commentaire.id;

  // ✅ État local pour la position du menu
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });

  // ✅ Texte avec mentions surlignées
  const texteRendu = useMemo(
    () => rendreMentions(commentaire.texte, listeProfils),
    [commentaire.texte, listeProfils]
  );

  // ✅ Gestion de l'ouverture du menu
  function toggleMenu(e) {
    e.stopPropagation();
    if (menuOuvert) {
      setMenuOuvertId(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 6,
        right: window.innerWidth - rect.right,
      });
      setMenuOuvertId(commentaire.id);
    }
  }

  return (
    <div
      className={`commentaire-bloc ${estReponse ? "est-reponse" : ""}`}
      data-commentaire-id={commentaire.id}
    >
      <div className="commentaire">
        <button
          onClick={() =>
            commentaire.auteur?.id &&
            onNavigate(`/profil/${commentaire.auteur.id}`)
          }
          style={{ flex: "none" }}
          aria-label="Voir le profil"
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
              {estReponse && commentaire.parent_info && (
                <div className="commentaire-repond-a">
                  <FiCornerDownRight size={12} />
                  <span>
                    Réponse à <b>{commentaire.parent_info.auteur_nom}</b>
                  </span>
                </div>
              )}

              <div className="commentaire-nom">
                <NomUtilisateur profil={commentaire.auteur} taille="sm" />
              </div>

              <div className="commentaire-bulle">
                <span>{texteRendu}</span>
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

        {/* Bouton 3 points */}
        {!enEdition && (
          <div
            className="commentaire-menu"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="commentaire-menu-btn"
              onClick={toggleMenu}
              aria-label="Options"
            >
              <FiMoreHorizontal size={16} />
            </button>
          </div>
        )}
      </div>

      {/* ✅ MENU RENDU VIA PORTAL (non coupé) */}
      {menuOuvert &&
        !enEdition &&
        createPortal(
          <div
            className="commentaire-menu-list-portal"
            style={{
              position: "fixed",
              top: menuPos.top,
              right: menuPos.right,
              zIndex: 99999,
            }}
            onClick={(e) => e.stopPropagation()}
          >
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
          </div>,
          document.body
        )}
    </div>
  );
}