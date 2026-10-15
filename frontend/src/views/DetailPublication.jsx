import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FiArrowLeft, FiAlertTriangle } from "react-icons/fi";
import Post from "../components/feed/Post";
import CommentairesModal from "../components/feed/CommentairesModal";
import { publication } from "../api/endpoints";
import { useAuthStore } from "../store/authStore";

export default function DetailPublication() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);

  const commentaireCible = searchParams.get("commentaire");

  const [modaleCommentaires, setModaleCommentaires] = useState(
    !!commentaireCible
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ["publication", id],
    queryFn: () => publication(id),
  });

  useEffect(() => {
    if (!commentaireCible || !data) return;

    let tentatives = 0;
    const maxTentatives = 20;

    const interval = setInterval(() => {
      const el = document.querySelector(
        `[data-commentaire-id="${commentaireCible}"]`
      );

      if (el) {
        clearInterval(interval);
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("commentaire-surligne");

        setTimeout(() => {
          el.classList.remove("commentaire-surligne");
        }, 3000);
      } else if (++tentatives >= maxTentatives) {
        clearInterval(interval);
      }
    }, 150);

    return () => clearInterval(interval);
  }, [commentaireCible, data, modaleCommentaires]);

  if (isLoading) return <p className="sub">Chargement…</p>;

  if (error || !data) {
    return (
      <div className="card" style={{ padding: 40, textAlign: "center" }}>
        <FiAlertTriangle
          size={48}
          style={{ color: "var(--live)", marginBottom: 12 }}
        />
        <p className="sub">Ce contenu n'est plus disponible.</p>
      </div>
    );
  }

  const estAuteur = data.auteur?.id === user?.id;
  const estMasquee = data.visibilite === "prive" && estAuteur;

  return (
    <>
      <button className="back" onClick={() => navigate(-1)}>
        <FiArrowLeft
          size={16}
          style={{ marginRight: 6, verticalAlign: "middle" }}
        />
        Retour
      </button>

      {estMasquee && (
        <div className="alerte-masquee">
          <FiAlertTriangle size={18} />
          <div>
            <b>Ton contenu est en cours d'examen</b>
            <p>
              Il n'est plus visible par les autres membres. Un modérateur va
              l'examiner prochainement. Tu recevras une notification dès qu'une
              décision sera prise.
            </p>
          </div>
        </div>
      )}

      <Post
        publication={data}
        onOuvrirCommentaires={() => setModaleCommentaires(true)}
      />

      {modaleCommentaires && (
        <CommentairesModal
          publication={data}
          onClose={() => {
            setModaleCommentaires(false);
            if (commentaireCible) {
              navigate(`/publication/${id}`, { replace: true });
            }
          }}
        />
      )}
    </>
  );
}