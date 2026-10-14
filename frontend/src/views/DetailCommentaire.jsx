import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FiArrowLeft, FiAlertTriangle } from "react-icons/fi";
import Avatar from "../components/ui/Avatar";
import { commentaires } from "../api/endpoints";
import { useAuthStore } from "../store/authStore";
import { formatRelative } from "../utils/format";

export default function DetailCommentaire() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const { data, isLoading } = useQuery({
    queryKey: ["commentaire", id],
    queryFn: async () => {
      // On récupère le commentaire par son ID via la liste filtrée
      const res = await commentaires({ id });
      const liste = res.results || res;
      return liste.find((c) => c.id === id) || null;
    },
  });

  if (isLoading) return <p className="sub">Chargement…</p>;
  if (!data) {
    return (
      <div className="card" style={{ padding: 40, textAlign: "center" }}>
        <FiAlertTriangle size={48} style={{ color: "var(--live)", marginBottom: 12 }} />
        <p className="sub">Ce commentaire n'est plus disponible.</p>
      </div>
    );
  }

  const estAuteur = data.auteur?.id === user?.id;
  const estMasque = data.statut === "masque" && estAuteur;

  return (
    <>
      <button className="back" onClick={() => navigate(-1)}>
        <FiArrowLeft size={16} style={{ marginRight: 6, verticalAlign: "middle" }} />
        Retour
      </button>

      {estMasque && (
        <div className="alerte-masquee">
          <FiAlertTriangle size={18} />
          <div>
            <b>Ton commentaire est en cours d'examen</b>
            <p>
              Il n'est plus visible par les autres membres. Un modérateur va
              l'examiner prochainement.
            </p>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
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
