import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FiArrowLeft, FiAlertTriangle } from "react-icons/fi";
import VideoCard from "../components/feed/VideoCard";
import Avatar from "../components/ui/Avatar";
import { video as fetchVideo } from "../api/endpoints";
import { useAuthStore } from "../store/authStore";
import { formatRelative } from "../utils/format";

export default function DetailVideo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const { data, isLoading, error } = useQuery({
    queryKey: ["video", id],
    queryFn: () => fetchVideo(id),
  });

  if (isLoading) return <p className="sub">Chargement…</p>;
  if (error || !data) {
    return (
      <div className="card" style={{ padding: 40, textAlign: "center" }}>
        <FiAlertTriangle size={48} style={{ color: "var(--live)", marginBottom: 12 }} />
        <p className="sub">Cette vidéo n'est plus disponible.</p>
      </div>
    );
  }

  const estAuteur = data.auteur?.id === user?.id;
  const estMasquee = data.statut === "masque" && estAuteur;

  return (
    <>
      <button className="back" onClick={() => navigate(-1)}>
        <FiArrowLeft size={16} style={{ marginRight: 6, verticalAlign: "middle" }} />
        Retour
      </button>

      {estMasquee && (
        <div className="alerte-masquee">
          <FiAlertTriangle size={18} />
          <div>
            <b>Ta vidéo est en cours d'examen</b>
            <p>
              Elle n'est plus visible par les autres membres. Un modérateur va
              l'examiner prochainement.
            </p>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 20 }}>
        <VideoCard video={data} />

        <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--line)" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Avatar profil={data.auteur} size="sm" />
            <div>
              <b>{data.auteur?.nom_affiche}</b>
              <div className="sub" style={{ fontSize: 13 }}>
                Publié {formatRelative(data.publie_le || data.cree_le)}
              </div>
            </div>
          </div>
          {data.description && (
            <p style={{ marginTop: 16, lineHeight: 1.6 }}>{data.description}</p>
          )}
        </div>
      </div>
    </>
  );
}
