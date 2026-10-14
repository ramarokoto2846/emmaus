import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FiArrowLeft, FiAlertTriangle } from "react-icons/fi";
import Post from "../components/feed/Post";
import { publication } from "../api/endpoints";
import { useAuthStore } from "../store/authStore";

export default function DetailPublication() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const { data, isLoading, error } = useQuery({
    queryKey: ["publication", id],
    queryFn: () => publication(id),
  });

  if (isLoading) return <p className="sub">Chargement…</p>;
  if (error || !data) {
    return (
      <div className="card" style={{ padding: 40, textAlign: "center" }}>
        <FiAlertTriangle size={48} style={{ color: "var(--live)", marginBottom: 12 }} />
        <p className="sub">Ce contenu n'est plus disponible.</p>
      </div>
    );
  }

  const estAuteur = data.auteur?.id === user?.id;
  const estMasquee = data.visibilite === "prive" && estAuteur;

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
            <b>Ton contenu est en cours d'examen</b>
            <p>
              Il n'est plus visible par les autres membres. Un modérateur va
              l'examiner prochainement. Tu recevras une notification dès qu'une
              décision sera prise.
            </p>
          </div>
        </div>
      )}

      <Post publication={data} />
    </>
  );
}
