import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Avatar from "../components/ui/Avatar";
import { useToast } from "../components/ui/Toast";
import { useConfirmation } from "../components/ui/Confirmation";
import NomUtilisateur from "../components/ui/NomUtilisateur";
import Button from "../components/ui/Button";
import Icon from "../components/ui/Icon";
import Post from "../components/feed/Post";
import ListeProfils from "../components/profile/ListeProfils";
import { useEstMoi } from "../hooks/useAuth";
import { useAuthStore } from "../store/authStore";
import {
  profil,
  suivre,
  videos,
  publications,
  demarrerConversation,
  abonnesDe,
  abonnementsDe,
  promouvoirModerateur,
  retrograderModerateur,
} from "../api/endpoints";

export default function Profile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const confirmer = useConfirmation();
  const { afficher: afficherToast } = useToast();
  const [onglet, setOnglet] = useState("videos");
  const [modale, setModale] = useState(null);

  const { data: p, isLoading } = useQuery({
    queryKey: ["profil", id],
    queryFn: () => profil(id),
  });

  const { data: videosData } = useQuery({
    queryKey: ["videos-profil", id],
    queryFn: () => videos({ auteur: id }),
    enabled: !!p,
  });

  const { data: pubsData, isLoading: pubsLoading } = useQuery({
    queryKey: ["publications-profil", id],
    queryFn: () => publications({ auteur: id }),
    enabled: !!p,
  });

  const suivreMutation = useMutation({
    mutationFn: () => suivre(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profil", id] });
      qc.invalidateQueries({ queryKey: ["profils"] });
    },
  });

  const estMoi = useEstMoi(p);
  const estAdmin = user?.role === "admin";

  const mutationRole = useMutation({
    mutationFn: ({ userId, action }) =>
      action === "promouvoir"
        ? promouvoirModerateur(userId)
        : retrograderModerateur(userId),
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ["profil", id] });
      qc.invalidateQueries({ queryKey: ["moderateurs"] });
      qc.invalidateQueries({ queryKey: ["fil"] });
      qc.invalidateQueries({ queryKey: ["commentaires"] });
      qc.invalidateQueries({ queryKey: ["notifications-list"] });

      if (variables.action === "promouvoir") {
        afficherToast(
          `${p.nom_affiche} est maintenant modérateur de la communauté.`,
          {
            type: "success",
            titre: "🎉 Modérateur nommé",
            duree: 5000,
          }
        );
      } else {
        afficherToast(
          `${p.nom_affiche} n'est plus modérateur.`,
          {
            type: "info",
            titre: "Rôle retiré",
            duree: 5000,
          }
        );
      }
    },
    onError: (err) => {
      afficherToast(
        err.response?.data?.detail || "Erreur lors du changement de rôle.",
        {
          type: "error",
          titre: "Erreur",
        }
      );
    },
  });

  async function handlePromouvoir() {
    const ok = await confirmer({
      titre: "Nommer modérateur ?",
      message: `${p.nom_affiche} pourra examiner les signalements et modérer les contenus. Choisis uniquement des personnes de confiance.`,
      labelConfirmer: "Nommer modérateur",
      labelAnnuler: "Annuler",
      danger: false,
    });
    if (ok) {
      mutationRole.mutate({ userId: p.id, action: "promouvoir" });
    }
  }

  async function handleRetrograder() {
    const ok = await confirmer({
      titre: "Retirer le rôle de modérateur ?",
      message: `${p.nom_affiche} perdra tous ses droits de modération.`,
      labelConfirmer: "Retirer",
      labelAnnuler: "Annuler",
      danger: true,
    });
    if (ok) {
      mutationRole.mutate({ userId: p.id, action: "retrograder" });
    }
  }

  // Charger les profils pour la modale
  useEffect(() => {
    if (!modale || modale.profils) return;
    const fetcher = modale.type === "abonnes" ? abonnesDe : abonnementsDe;
    fetcher(id).then((data) => {
      setModale({ ...modale, profils: data.results || data || [] });
    });
  }, [modale, id]);

  async function handleMessage() {
    try {
      const conv = await demarrerConversation(p.id);
      qc.invalidateQueries({ queryKey: ["conversations"] });
      navigate(`/messages/${conv.id}`);
    } catch (e) {
      console.error(e);
    }
  }

  async function handlePartager() {
    const url = `${window.location.origin}/profil/${p.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${p.nom_affiche} sur Emmaüs`,
          text: p.bio || `Découvre le profil de ${p.nom_affiche}`,
          url,
        });
      } catch {
        /* annulé */
      }
    } else {
      await navigator.clipboard.writeText(url);
      alert("Lien du profil copié !");
    }
  }

  if (isLoading) return <p className="sub">Chargement…</p>;
  if (!p) return <p className="sub">Profil introuvable.</p>;

  const videosList = videosData?.results || videosData || [];
  const toutesPubs = pubsData?.results || pubsData || [];
  const pubsVideos = toutesPubs.filter((x) => x.video || x.type === "video");
  const pubsStatuts = toutesPubs.filter((x) => !x.video && x.type !== "video");

  const ONGLETS = [
    { k: "videos", label: `Vidéos · ${pubsVideos.length}` },
    { k: "statuts", label: `Statuts · ${pubsStatuts.length}` },
    { k: "propos", label: "À propos" },
  ];

  return (
    <>
      <button className="back" onClick={() => navigate(-1)}>
        ← Retour
      </button>

      {/* EN-TÊTE */}
      <div className="card pf">
        <div
          className="cover"
          style={{
            background:
              p.couverture || p.couverture_url
                ? `url(${p.couverture || p.couverture_url}) center/cover`
                : "linear-gradient(135deg, #4A0F1A, #8E2233 60%, #D4A233)",
          }}
        />
        <div className="pr">
          <Avatar profil={p} />
          <div>
            <h1><NomUtilisateur profil={p} /></h1>
            <div className="sub">
              {p.sous_titre || p.ville || "Membre Emmaüs"}
            </div>
          </div>
          <div className="btns">
            {estMoi ? (
              <>
                <Button variant="alt" onClick={() => navigate("/parametres")}>
                  Modifier mon profil
                </Button>
                <Button variant="fl" icon="share" onClick={handlePartager}>
                  Partager
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant={p.est_suivi ? "alt" : "default"}
                  onClick={() => suivreMutation.mutate()}
                  disabled={suivreMutation.isPending}
                >
                  {suivreMutation.isPending
                    ? "…"
                    : p.est_suivi
                    ? "Abonné"
                    : "Suivre"}
                </Button>
                <Button variant="alt" onClick={handleMessage}>
                  Message
                </Button>

                {/* Admin : promotion modérateur */}
                {estAdmin && p.role !== "admin" && (
                  <>
                    {p.role === "moderateur" ? (
                      <Button
                        variant="alt"
                        onClick={handleRetrograder}
                        disabled={mutationRole.isPending}
                      >
                        {mutationRole.isPending
                          ? "…"
                          : "Retirer modérateur"}
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        onClick={handlePromouvoir}
                        disabled={mutationRole.isPending}
                        style={{
                          background: "#8B5A00",
                          color: "#fff",
                        }}
                      >
                        {mutationRole.isPending
                          ? "…"
                          : "Nommer modérateur"}
                      </Button>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
        {p.bio && <p className="bio">{p.bio}</p>}

        {/* Stats : abonnés / abonnements cliquables */}
        <div className="stats">
          <button
            className="stat-btn"
            onClick={() =>
              setModale({ titre: "Abonnés", type: "abonnes", profils: null })
            }
          >
            <b>{p.nb_abonnes}</b>
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
            <b>{p.nb_abonnements ?? 0}</b>
            <span>abonnements</span>
          </button>
        </div>
      </div>

      {/* ONGLETS */}
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

      {/* VIDÉOS */}
      {onglet === "videos" && (
        <>
          {pubsLoading ? (
            <p className="sub">Chargement…</p>
          ) : pubsVideos.length === 0 && videosList.length === 0 ? (
            <p className="sub">
              {p.nom_affiche} n'a publié aucune vidéo pour l'instant.
            </p>
          ) : (
            <>
              {pubsVideos.map((pub) => (
                <Post key={pub.id} publication={pub} />
              ))}
              {videosList.length > 0 && pubsVideos.length === 0 && (
                <div className="grid">
                  {videosList.map((v, i) => (
                    <div
                      key={v.id}
                      className="vid"
                      style={{
                        "--g": `linear-gradient(135deg, hsl(${(i * 40) % 360}, 40%, 25%), hsl(${(i * 40 + 30) % 360}, 50%, 40%))`,
                      }}
                    >
                      <span className="dur">{v.duree || "—"}</span>
                      <span className="play">
                        <Icon name="tri" />
                      </span>
                      <div className="vt">
                        {v.titre}
                        <small>{v.nb_vues} vues</small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* STATUTS */}
      {onglet === "statuts" && (
        <>
          {pubsLoading ? (
            <p className="sub">Chargement…</p>
          ) : pubsStatuts.length === 0 ? (
            <p className="sub">
              {p.nom_affiche} n'a publié aucun statut pour l'instant.
            </p>
          ) : (
            pubsStatuts.map((pub) => (
              <Post key={pub.id} publication={pub} />
            ))
          )}
        </>
      )}

      {/* À PROPOS */}
      {onglet === "propos" && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 16 }}>Informations</h3>
          <div className="info-grid">
            <Info label="Nom affiché" value={p.nom_affiche} />
            <Info label="Pseudo" value={`@${p.pseudo}`} />
            <Info
              label="Rôle"
              value={
                p.role === "moderateur"
                  ? "🛡️ Modérateur"
                  : p.role === "admin"
                  ? "👑 Administrateur"
                  : "Membre"
              }
            />
            <Info label="Ville" value={p.ville} />
            <Info label="Pays" value={p.pays} />
            <Info label="Site web" value={p.site_web} link />
            <Info label="Église" value={p.eglise || "—"} />
          </div>
          {p.bio && (
            <>
              <h3 style={{ marginTop: 24, marginBottom: 12 }}>Bio</h3>
              <p style={{ lineHeight: 1.6 }}>{p.bio}</p>
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
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="info-value"
        >
          {value}
        </a>
      ) : (
        <span className="info-value">{value}</span>
      )}
    </div>
  );
}
