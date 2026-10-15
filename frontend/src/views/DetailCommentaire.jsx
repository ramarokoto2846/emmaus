import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FiAlertTriangle } from "react-icons/fi";
import Avatar from "../components/ui/Avatar";
import { commentaire as getCommentaire } from "../api/endpoints";
import { formatRelative } from "../utils/format";

/**
 * Route /commentaire/:id
 * → Charge le commentaire, récupère sa publication parente,
 *   puis redirige vers /publication/:pubId?commentaire=:id
 */
export default function DetailCommentaire() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ["commentaire-redirect", id],
    queryFn: () => getCommentaire(id),
    enabled: !!id,
  });

  useEffect(() => {
    if (data && data.cible_type === "publication") {
      navigate(`/publication/${data.cible_id}?commentaire=${id}`, {
        replace: true,
      });
    }
  }, [data, id, navigate]);

  if (isLoading) return <p className="sub">Chargement…</p>;

  if (error || !data) {
    return (
      <div className="card" style={{ padding: 40, textAlign: "center" }}>
        <FiAlertTriangle
          size={48}
          style={{ color: "var(--live)", marginBottom: 12 }}
        />
        <p className="sub">Ce commentaire n'est plus disponible.</p>
      </div>
    );
  }

  return (
    <>
      <button className="back" onClick={() => navigate(-1)}>
        Retour
      </button>
      <div className="card" style={{ padding: 20 }}>
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <Avatar profil={data.auteur} size="sm" />
          <div>
            <b>{data.auteur?.nom_affiche}</b>
            <div className="sub" style={{ fontSize: 13 }}>
              {formatRelative(data.cree_le)}
            </div>
          </div>
        </div>
        <p style={{ lineHeight: 1.6 }}>{data.texte}</p>
      </div>
    </>
  );
}