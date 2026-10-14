import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Avatar from "../components/ui/Avatar";
import Button from "../components/ui/Button";
import Icon from "../components/ui/Icon";
import Post from "../components/feed/Post";
import ListeProfils from "../components/profile/ListeProfils";
import { useAuthStore } from "../store/authStore";
import {
  publications,
  videos,
  abonnesDe,
  abonnementsDe,
} from "../api/endpoints";

export default function Me() {
  const profil = useAuthStore((s) => s.profil);
  const navigate = useNavigate();
  const [onglet, setOnglet] = useState("videos");
  const [modale, setModale] = useState(null);

  const { data: pubsData, isLoading: pubsLoading } = useQuery({
    queryKey: ["mes-publications", profil?.id],
    queryFn: () => publications({ auteur: profil?.id }),
    enabled: !!profil,
  });

  const { data: videosData } = useQuery({
    queryKey: ["mes-videos", profil?.id],
    queryFn: () => videos({ auteur: profil?.id }),
    enabled: !!profil,
  });

  // Charger les profils pour la modale
  useEffect(() => {
    if (!modale || modale.profils) return;
    const fetcher = modale.type === "abonnes" ? abonnesDe : abonnementsDe;
    fetcher(profil.id).then((data) => {
      setModale({ ...modale, profils: data.results || data || [] });
    });
  }, [modale, profil?.id]);

  async function partager() {
    const url = `${window.location.origin}/profil/${profil.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${profil.nom_affiche} sur Emmaüs`, url });
      } catch {
        /* annulé */
      }
    } else {
      await navigator.clipboard.writeText(url);
      alert("Lien copié !");
    }
  }

  if (!profil) return <p className="sub">Chargement…</p>;

  const toutesPubs = pubsData?.results || pubsData || [];
  const videosList = videosData?.results || videosData || [];

  const pubsVideos = toutesPubs.filter((p) => p.video || p.type === "video");
  const pubsStatuts = toutesPubs.filter((p) => !p.video && p.type !== "video");

  const ONGLETS = [
    { k: "videos", label: `Vidéos · ${pubsVideos.length}` },
    { k: "statuts", label: `Statuts · ${pubsStatuts.length}` },
    { k: "propos", label: "À propos" },
  ];

  return (
    <>
      <div className="card pf">
        <div
          className="cover"
          style={{
            background:
              profil.couverture || profil.couverture_url
                ? `url(${profil.couverture || profil.couverture_url}) center/cover`
                : "linear-gradient(135deg, #6B1626, #A8323F 55%, #E3B94F)",
          }}
        />
        <div className="pr">
          <Avatar profil={profil} />
          <div>
            <h1>{profil.nom_affiche}</h1>
            <div className="sub">
              {profil.sous_titre || profil.ville || "Membre Emmaüs"}
            </div>
          </div>
          <div className="btns">
            <Button
              variant="alt"
              icon="user"
              onClick={() => navigate("/parametres")}
            >
              Modifier mon profil
            </Button>
            <Button variant="fl" icon="share" onClick={partager}>
              Partager
            </Button>
          </div>
        </div>
        {profil.bio && <p className="bio">{profil.bio}</p>}

        {/* Stats : abonnés / abonnements cliquables */}
        <div className="stats">
          <button
            className="stat-btn"
            onClick={() =>
              setModale({ titre: "Abonnés", type: "abonnes", profils: null })
            }
          >
            <b>{profil.nb_abonnes}</b>
            <span>abonnés</span>
          </button>
          <button
            className="stat-btn"
            onClick={() =>
              setModale({
                titre: "Abonnements",
                type: "abonnements",
                profils: null,
              })
            }
          >
            <b>{profil.nb_abonnements}</b>
            <span>abonnements</span>
          </button>
        </div>
      </div>

      {/* Onglets avec compteurs */}
      <div className="tabs">
        {ONGLETS.map((o) => (
          <button
            key={o.k}
            className={onglet === o.k ? "on" : ""}
            onClick={() => setOnglet(o.k)}
          >
            {o.label}
          </button>
        ))}
      </div>

      {onglet === "videos" && (
        <>
          {pubsLoading ? (
            <p className="sub">Chargement…</p>
          ) : pubsVideos.length === 0 && videosList.length === 0 ? (
            <div className="card post" style={{ textAlign: "center" }}>
              <p className="sub" style={{ marginBottom: 14 }}>
                Tu n'as publié aucune vidéo pour l'instant.
              </p>
              <Button variant="fl" icon="plus" onClick={() => navigate("/?composer=1")}>
                Publier une vidéo
              </Button>
            </div>
          ) : (
            pubsVideos.map((p) => <Post key={p.id} publication={p} />)
          )}
        </>
      )}

      {onglet === "statuts" && (
        <>
          {pubsLoading ? (
            <p className="sub">Chargement…</p>
          ) : pubsStatuts.length === 0 ? (
            <div className="card post" style={{ textAlign: "center" }}>
              <p className="sub" style={{ marginBottom: 14 }}>
                Tu n'as publié aucun statut pour l'instant.
              </p>
              <Button variant="fl" icon="plus" onClick={() => navigate("/?composer=1")}>
                Écrire un statut
              </Button>
            </div>
          ) : (
            pubsStatuts.map((p) => <Post key={p.id} publication={p} />)
          )}
        </>
      )}

      {onglet === "propos" && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 16 }}>Informations</h3>
          <div className="info-grid">
            <Info label="Nom affiché" value={profil.nom_affiche} />
            <Info label="Pseudo" value={`@${profil.pseudo}`} />
            <Info label="Rôle" value={profil.role || "membre"} />
            <Info label="Ville" value={profil.ville} />
            <Info label="Pays" value={profil.pays} />
            <Info label="Site web" value={profil.site_web} link />
            <Info label="Visibilité" value={profil.visibilite} />
          </div>
          {profil.bio && (
            <>
              <h3 style={{ marginTop: 24, marginBottom: 12 }}>Bio</h3>
              <p style={{ lineHeight: 1.6 }}>{profil.bio}</p>
            </>
          )}
        </div>
      )}

      {/* Modale abonnés/abonnements */}
      {modale && (
        <ListeProfils
          titre={modale.titre}
          profils={modale.profils}
          onClose={() => setModale(null)}
        />
      )}
    </>
  );
}

function Info({ label, value, link }) {
  if (!value) value = "—";
  return (
    <div className="info-item">
      <span className="info-label">{label}</span>
      {link && value !== "—" ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="info-value">
          {value}
        </a>
      ) : (
        <span className="info-value">{value}</span>
      )}
    </div>
  );
}
