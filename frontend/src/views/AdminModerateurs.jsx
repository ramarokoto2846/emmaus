import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiShield, FiUserX } from "react-icons/fi";
import Avatar from "../components/ui/Avatar";
import { listeModerateurs } from "../api/endpoints";

export default function AdminModerateurs() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["moderateurs"],
    queryFn: listeModerateurs,
  });

  const liste = data || [];

  return (
    <>
      <button className="back" onClick={() => navigate(-1)}>
        <FiArrowLeft
          size={16}
          style={{ marginRight: 6, verticalAlign: "middle" }}
        />
        Retour
      </button>

      <h1 className="vh">
        <FiShield
          size={22}
          style={{ marginRight: 8, verticalAlign: "middle" }}
        />
        Modérateurs
      </h1>
      <p className="sub vs">
        Les modérateurs peuvent examiner les signalements et décider du sort
        des contenus.
      </p>

      {isLoading ? (
        <p className="sub">Chargement…</p>
      ) : liste.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <p className="sub">
            Aucun modérateur nommé pour le moment. Va sur le profil d'un membre
            de confiance pour le promouvoir.
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 8 }}>
          {liste.map((m) => (
            <button
              key={m.id}
              className="row"
              onClick={() => navigate(`/profil/${m.id}`)}
            >
              <Avatar profil={m} size="sm" />
              <div>
                <b>{m.nom_affiche}</b>
                <small>@{m.pseudo}</small>
              </div>
              <span className="mini">Voir</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
