import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Avatar from "../components/ui/Avatar";
import { recherche } from "../api/endpoints";

export default function Recherche() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [q, setQ] = useState(params.get("q") || "");

  // Debounce
  const [qDebounced, setQDebounced] = useState(q);
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Met à jour l'URL
  useEffect(() => {
    if (qDebounced.trim().length >= 2) {
      params.set("q", qDebounced.trim());
    } else {
      params.delete("q");
    }
    setParams(params, { replace: true });
  }, [qDebounced]);

  const { data, isLoading } = useQuery({
    queryKey: ["recherche", qDebounced],
    queryFn: () => recherche(qDebounced),
    enabled: qDebounced.trim().length >= 2,
  });

  const profils = data?.profils || [];
  const videos = data?.videos || [];

  return (
    <>
      <h1 className="vh">Recherche</h1>
      <p className="sub vs">
        Cherche un membre, une prédication, un thème…
      </p>

      <input
        type="text"
        placeholder="Chercher un nom, un titre…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus
        style={{
          width: "100%",
          padding: "14px 20px",
          borderRadius: 99,
          border: "1px solid var(--line)",
          background: "var(--surf)",
          color: "var(--ink)",
          fontSize: 16,
          marginBottom: 24,
        }}
      />

      {qDebounced.trim().length < 2 ? (
        <p className="sub">Tape au moins 2 caractères pour lancer la recherche.</p>
      ) : isLoading ? (
        <p className="sub">Recherche…</p>
      ) : (
        <>
          {profils.length > 0 && (
            <>
              <h3 style={{ marginBottom: 12 }}>Profils</h3>
              <div className="pg" style={{ marginBottom: 32 }}>
                {profils.map((p) => (
                  <div
                    key={p.id}
                    className="card pc"
                    tabIndex={0}
                    onClick={() => navigate(`/profil/${p.id}`)}
                  >
                    <div
                      className="cv2"
                      style={{
                        background:
                          "linear-gradient(135deg, #6B1626, #A8323F 55%, #E3B94F)",
                      }}
                    />
                    <Avatar profil={p} />
                    <b>{p.nom_affiche}</b>
                    <small>{p.sous_titre || p.ville || "Membre Emmaüs"}</small>
                    <small>{p.nb_abonnes} abonnés</small>
                  </div>
                ))}
              </div>
            </>
          )}

          {videos.length > 0 && (
            <>
              <h3 style={{ marginBottom: 12 }}>Vidéos</h3>
              <div className="grid">
                {videos.map((v, i) => (
                  <div
                    key={v.id}
                    className="vid"
                    style={{
                      "--g": `linear-gradient(135deg, hsl(${(i * 40) % 360}, 40%, 25%), hsl(${(i * 40 + 30) % 360}, 50%, 40%))`,
                    }}
                    onClick={() => navigate(`/video/${v.id}`)}
                  >
                    <span className="dur">{v.duree || "—"}</span>
                    <span className="play">
                      <svg className="i" viewBox="0 0 24 24">
                        <path d="M6 3l15 9-15 9z" />
                      </svg>
                    </span>
                    <div className="vt">
                      {v.titre}
                      <small>{v.nb_vues} vues</small>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {profils.length === 0 && videos.length === 0 && (
            <p className="sub">Aucun résultat pour « {qDebounced} ».</p>
          )}
        </>
      )}
    </>
  );
}
