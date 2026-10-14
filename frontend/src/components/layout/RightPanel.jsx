import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Avatar from "../ui/Avatar";
import Icon from "../ui/Icon";
import { directsLive, profils, themes } from "../../api/endpoints";

export default function RightPanel() {
  const navigate = useNavigate();

  const { data: lives } = useQuery({
    queryKey: ["directs-live"],
    queryFn: directsLive,
    refetchInterval: 60_000,
  });

  const { data: profilsData } = useQuery({
    queryKey: ["profils-suggestions"],
    queryFn: () => profils({ ordering: "-nb_abonnes" }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: themesData } = useQuery({
    queryKey: ["themes-tendance"],
    queryFn: () => themes(),
    staleTime: 60 * 60 * 1000,
  });

  const suggestions = (profilsData?.results || []).slice(0, 3);
  const themesTendance = (themesData || [])
    .filter((t) => t.tendance)
    .slice(0, 4);
  const live = lives?.[0];

  return (
    <aside className="right">
      {live && (
        <div className="card rlive">
          <span className="badge">● EN DIRECT</span>
          <h3>{live.titre}</h3>
          <p>{live.nb_spectateurs_actuels} personnes regardent</p>
          <button className="btn fl" onClick={() => navigate(`/direct/${live.id}`)}>
            Rejoindre le direct
          </button>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="card box">
          <h3>Profils à découvrir</h3>
          {suggestions.map((p) => (
            <button
              key={p.id}
              className="row"
              onClick={() => navigate(`/profil/${p.id}`)}
            >
              <Avatar profil={p} size="sm" />
              <div>
                <b>{p.nom_affiche}</b>
                <small>{p.sous_titre || p.ville || "Membre Emmaüs"}</small>
              </div>
              <span className="mini">Voir</span>
            </button>
          ))}
          <button
            className="btn alt"
            style={{ width: "100%", justifyContent: "center", marginTop: 10 }}
            onClick={() => navigate("/decouvrir")}
          >
            Voir tous les profils
          </button>
        </div>
      )}

      {themesTendance.length > 0 && (
        <div className="card box">
          <h3>Thèmes du moment</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {themesTendance.map((t) => (
              <span key={t.id} className="chip" style={{ margin: 0 }}>
                {t.nom}
              </span>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
