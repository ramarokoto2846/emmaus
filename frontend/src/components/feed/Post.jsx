import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FiEdit2, FiTrash2, FiFlag, FiMoreHorizontal } from "react-icons/fi";
import Avatar from "../ui/Avatar";
import Icon from "../ui/Icon";
import VideoCard from "./VideoCard";
import CommentairesModal from "./CommentairesModal";
import Signalement from "../ui/Signalement";
import { useConfirmation } from "../ui/Confirmation";
import { useAuthStore } from "../../store/authStore";
import {
  amenPublication,
  majPublication,
  supprimerPublication,
} from "../../api/endpoints";
import { formatRelative } from "../../utils/format";

export default function Post({ publication }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const monProfil = useAuthStore((s) => s.profil);
  const confirmer = useConfirmation();

  const [menuOuvert, setMenuOuvert] = useState(false);
  const [editionOuverte, setEditionOuverte] = useState(false);
  const [nouveauTexte, setNouveauTexte] = useState(publication.texte || "");
  const [signalementOuvert, setSignalementOuvert] = useState(false);
  const [commentairesOuverts, setCommentairesOuverts] = useState(false);
  const menuRef = useRef(null);

  const auteur = publication.auteur;
  const video = publication.video;
  const verset = publication.verset;
  const estAuteur = monProfil && auteur && monProfil.id === auteur.id;

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOuvert(false);
      }
    }
    if (menuOuvert) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOuvert]);

  const amenMutation = useMutation({
    mutationFn: () => amenPublication(publication.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fil"] });
      qc.invalidateQueries({ queryKey: ["mes-publications"] });
      qc.invalidateQueries({ queryKey: ["publications-profil"] });
    },
  });

  const majMutation = useMutation({
    mutationFn: (data) => majPublication(publication.id, data),
    onSuccess: () => {
      setEditionOuverte(false);
      qc.invalidateQueries({ queryKey: ["fil"] });
      qc.invalidateQueries({ queryKey: ["mes-publications"] });
      qc.invalidateQueries({ queryKey: ["publications-profil"] });
    },
  });

  const supprMutation = useMutation({
    mutationFn: () => supprimerPublication(publication.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fil"] });
      qc.invalidateQueries({ queryKey: ["mes-publications"] });
      qc.invalidateQueries({ queryKey: ["publications-profil"] });
    },
  });

  function enregistrerEdition() {
    const t = nouveauTexte.trim();
    if (!t) return;
    majMutation.mutate({ texte: t });
  }

  async function supprimer() {
    setMenuOuvert(false);
    const ok = await confirmer({
      titre: "Supprimer cette publication ?",
      message: "Cette action est définitive.",
      labelConfirmer: "Supprimer",
      labelAnnuler: "Annuler",
      danger: true,
    });
    if (ok) supprMutation.mutate();
  }

  return (
    <article className="card post">
      <div className="ph">
        <button
          className="who"
          onClick={() => auteur?.id && navigate(`/profil/${auteur.id}`)}
        >
          <Avatar profil={auteur} />
          <div>
            <b>{auteur?.nom_affiche || "Anonyme"}</b>
            <br />
            <small>{formatRelative(publication.cree_le)}</small>
          </div>
        </button>

        {/* Menu 3 points */}
        <div className="post-menu" ref={menuRef}>
          <button
            className="more"
            aria-label="Plus d'options"
            onClick={() => setMenuOuvert((v) => !v)}
          >
            <FiMoreHorizontal size={20} />
          </button>

          {menuOuvert && (
            <div className="post-menu-list">
              {estAuteur ? (
                <>
                  <button
                    onClick={() => {
                      setEditionOuverte(true);
                      setNouveauTexte(publication.texte || "");
                      setMenuOuvert(false);
                    }}
                  >
                    <FiEdit2 size={15} /> Modifier
                  </button>
                  <button onClick={supprimer} className="danger">
                    <FiTrash2 size={15} /> Supprimer
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
                  <FiFlag size={15} /> Signaler
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* TEXTE ou ÉDITION */}
      {editionOuverte ? (
        <div style={{ margin: "14px 0" }}>
          <textarea
            value={nouveauTexte}
            onChange={(e) => setNouveauTexte(e.target.value)}
            rows={4}
            autoFocus
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 12,
              border: "1px solid var(--line)",
              background: "var(--bg)",
              color: "var(--ink)",
              font: "inherit",
              resize: "vertical",
            }}
          />
          <div
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
              marginTop: 8,
            }}
          >
            <button
              className="btn alt"
              onClick={() => setEditionOuverte(false)}
              disabled={majMutation.isPending}
            >
              Annuler
            </button>
            <button
              className="btn"
              onClick={enregistrerEdition}
              disabled={majMutation.isPending || !nouveauTexte.trim()}
            >
              {majMutation.isPending ? "…" : "Enregistrer"}
            </button>
          </div>
        </div>
      ) : (
        publication.texte && <p>{publication.texte}</p>
      )}

      {video && <VideoCard video={video} />}

      {verset && (
        <span className="chip">
          <Icon name="book" />
          {verset.reference}
        </span>
      )}

      <div className="acts">
        <button
          className={publication.est_amen ? "on" : ""}
          onClick={() => amenMutation.mutate()}
        >
          <Icon name="flame" />
          Amen · <span>{publication.nb_amen}</span>
        </button>
        <button onClick={() => setCommentairesOuverts(true)}>
          <Icon name="chat" />
          {publication.nb_commentaires}
        </button>
        <button>
          <Icon name="share" />
          Partager
        </button>
        <button className="sv" aria-label="Enregistrer">
          <Icon name="mark" />
        </button>
      </div>

      {/* Modal commentaires */}
      {commentairesOuverts && (
        <CommentairesModal
          publication={publication}
          onClose={() => setCommentairesOuverts(false)}
        />
      )}

      {/* Modal signalement */}
      {signalementOuvert && (
        <Signalement
          cibleType="publication"
          cibleId={publication.id}
          onClose={() => setSignalementOuvert(false)}
        />
      )}
    </article>
  );
}
