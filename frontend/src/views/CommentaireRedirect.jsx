import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { commentaire as getCommentaire } from "../api/endpoints";

/**
 * Route /commentaire/:id
 * → Charge le commentaire, récupère sa publication parente,
 *   puis redirige vers /publication/:pubId?commentaire=:id
 */
export default function CommentaireRedirect() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ["commentaire-redirect", id],
    queryFn: () => getCommentaire(id),
    enabled: !!id,
  });

  useEffect(() => {
    if (data && data.cible_type === "publication") {
      // Redirige vers la publication avec l'ancre du commentaire
      navigate(`/publication/${data.cible_id}?commentaire=${id}`, {
        replace: true,
      });
    }
  }, [data, id, navigate]);

  if (isLoading) return <p className="sub">Chargement…</p>;
  if (error || !data) return <p className="sub">Commentaire introuvable.</p>;
  return null;
}