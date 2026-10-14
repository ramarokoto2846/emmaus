import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FiCheck,
  FiAlertTriangle,
  FiFilm,
  FiMessageCircle,
  FiFileText,
} from "react-icons/fi";
import Avatar from "../components/ui/Avatar";
import { useConfirmation } from "../components/ui/Confirmation";
import { useToast } from "../components/ui/Toast";
import {
  moderationSignalements,
  moderationRemettre,
  moderationConfirmer,
  moderationSupprimerDefinitif,
} from "../api/endpoints";
import { formatRelative } from "../utils/format";

const MOTIFS = {
  non_evangelique: "Non évangélique",
  harcelement: "Harcèlement",
  contenu_sexuel: "Contenu sexuel",
  haine: "Discours de haine",
  fausse_info: "Fausse doctrine",
  spam: "Spam",
  droits_auteur: "Droits d'auteur",
  autre: "Autre",
};

const TYPES_LABEL = {
  publication: "Publication",
  video: "Vidéo",
  commentaire: "Commentaire",
};

const TYPES_ICON = {
  publication: FiFileText,
  video: FiFilm,
  commentaire: FiMessageCircle,
};

export default function Moderation() {
  const qc = useQueryClient();
  const confirmer = useConfirmation();
  const { afficher: afficherToast } = useToast();

  const { data, isLoading, error } = useQuery({
    queryKey: ["moderation-signalements"],
    queryFn: moderationSignalements,
    refetchInterval: 30_000,
  });

  const remettreMutation = useMutation({
    mutationFn: (id) => moderationRemettre(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["moderation-signalements"] });
      qc.invalidateQueries({ queryKey: ["moderation-count"] });
      qc.invalidateQueries({ queryKey: ["fil"] });
      afficherToast(
        "Le contenu est de nouveau visible par tous.",
        {
          type: "success",
          titre: "Contenu remis en ligne",
        }
      );
    },
  });

  const confirmerMutation = useMutation({
    mutationFn: (id) => moderationConfirmer(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["moderation-signalements"] });
      qc.invalidateQueries({ queryKey: ["moderation-count"] });
      afficherToast(
        "Le signalement est confirmé, le contenu reste masqué.",
        {
          type: "info",
          titre: "Suspension confirmée",
        }
      );
    },
  });

  const supprDefinitiveMutation = useMutation({
    mutationFn: (id) => moderationSupprimerDefinitif(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["moderation-signalements"] });
      qc.invalidateQueries({ queryKey: ["moderation-count"] });
      qc.invalidateQueries({ queryKey: ["fil"] });
      afficherToast("Le contenu a été supprimé définitivement.", {
        type: "success",
        titre: "Contenu supprimé",
      });
    },
  });

  async function handleSupprimer(item) {
    const ok = await confirmer({
      titre: "Supprimer définitivement ?",
      message: "Le contenu sera supprimé de la base. Cette action est irréversible.",
      labelConfirmer: "Supprimer",
      danger: true,
    });
    if (ok) supprDefinitiveMutation.mutate(item.id);
  }

  async function handleRemettre(item) {
    const ok = await confirmer({
      titre: "Remettre en ligne ?",
      message: "Le contenu redevient visible par tous.",
      labelConfirmer: "Remettre",
      danger: false,
    });
    if (ok) remettreMutation.mutate(item.id);
  }

  async function handleConfirmer(item) {
    const ok = await confirmer({
      titre: "Confirmer la suspension ?",
      message: "Le contenu restera masqué définitivement.",
      labelConfirmer: "Confirmer",
      danger: true,
    });
    if (ok) confirmerMutation.mutate(item.id);
  }

  if (isLoading) return <p className="sub">Chargement…</p>;
  if (error) return <p className="sub">Erreur : {error.message}</p>;

  const liste = Array.isArray(data) ? data : data?.results || [];

  return (
    <>
      <h1 className="vh">Modération</h1>
      <p className="sub vs">
        {liste.length} signalement{liste.length > 1 ? "s" : ""} en attente.
      </p>

      {liste.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <FiCheck size={48} style={{ color: "var(--brand)", marginBottom: 12 }} />
          <p className="sub">Aucun signalement en attente. Tout est en ordre !</p>
        </div>
      ) : (
        liste.map((s) => {
          const IconeType = TYPES_ICON[s.cible_type] || FiAlertTriangle;
          const typeLabel = TYPES_LABEL[s.cible_type] || s.cible_type;

          return (
            <div
              key={s.id}
              className="card moderation-card"
            >
              {/* En-tête */}
              <div className="moderation-head">
                <div className="moderation-icon-wrap">
                  <FiAlertTriangle size={20} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b>{MOTIFS[s.motif] || s.motif}</b>
                  <div className="sub" style={{ fontSize: 13 }}>
                    Signalé par <b>{s.auteur_signalement?.nom_affiche}</b> ·{" "}
                    {formatRelative(s.cree_le)}
                  </div>
                </div>
                {s.nb_signalements > 1 && (
                  <span className="moderation-count-badge">
                    {s.nb_signalements}
                  </span>
                )}
              </div>

              {/* Type badge */}
              <div className="moderation-type-badge">
                <IconeType size={14} />
                <span>{typeLabel}</span>
              </div>

              {/* Contenu signalé */}
              {s.cible ? (
                <div className="moderation-content">
                  <div className="moderation-auteur">
                    <Avatar
                      profil={{
                        nom_affiche: s.cible.auteur?.nom_affiche || "?",
                        initiales: s.cible.auteur?.nom_affiche?.[0] || "?",
                      }}
                      size="sm"
                    />
                    <div>
                      <b>{s.cible.auteur?.nom_affiche || "Anonyme"}</b>
                      <div className="sub" style={{ fontSize: 12 }}>
                        Auteur{" "}
                        {s.cible_type === "video"
                          ? "de la vidéo"
                          : s.cible_type === "publication"
                          ? "de la publication"
                          : "du commentaire"}
                      </div>
                    </div>
                  </div>

                  <div className="moderation-content-body">
                    {/* CAS 1 : Signalement d'une VIDÉO directe */}
                    {s.cible_type === "video" && (
                      <>
                        <h4 className="moderation-titre">
                          🎬 {s.cible.titre || "(sans titre)"}
                        </h4>

                        {s.cible.fichier_url ? (
                          <div className="moderation-player">
                            <video
                              controls
                              preload="metadata"
                              poster={s.cible.miniature_url || undefined}
                              src={s.cible.fichier_url}
                              playsInline
                            />
                          </div>
                        ) : s.cible.miniature_url ? (
                          <img
                            src={s.cible.miniature_url}
                            alt={s.cible.titre}
                            className="moderation-miniature"
                          />
                        ) : (
                          <p className="sub" style={{ margin: 0 }}>
                            (fichier vidéo indisponible)
                          </p>
                        )}

                        {s.cible.description && (
                          <p className="moderation-desc">
                            {s.cible.description}
                          </p>
                        )}
                      </>
                    )}

                    {/* CAS 2 : Signalement d'une PUBLICATION (peut contenir vidéo + texte + verset) */}
                    {s.cible_type === "publication" && (
                      <>
                        {/* Texte de la publication */}
                        {s.cible.texte && (
                          <p className="moderation-texte">
                            {s.cible.texte}
                          </p>
                        )}

                        {/* Vidéo liée à la publication */}
                        {s.cible.video && (
                          <div className="moderation-video-bloc">
                            <h5 className="moderation-sous-titre">
                              🎬 Vidéo : {s.cible.video.titre || "(sans titre)"}
                            </h5>
                            {s.cible.video.fichier_url ? (
                              <div className="moderation-player">
                                <video
                                  controls
                                  preload="metadata"
                                  poster={s.cible.video.miniature_url || undefined}
                                  src={s.cible.video.fichier_url}
                                  playsInline
                                />
                              </div>
                            ) : s.cible.video.miniature_url ? (
                              <img
                                src={s.cible.video.miniature_url}
                                alt={s.cible.video.titre}
                                className="moderation-miniature"
                              />
                            ) : (
                              <p className="sub" style={{ margin: 0 }}>
                                (fichier vidéo indisponible)
                              </p>
                            )}
                            {s.cible.video.description && (
                              <p className="moderation-desc">
                                {s.cible.video.description}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Verset lié */}
                        {s.cible.verset && (
                          <div className="moderation-verset">
                            <b>📖 {s.cible.verset.reference}</b>
                            <p>{s.cible.verset.texte}</p>
                          </div>
                        )}
                      </>
                    )}

                    {/* CAS 3 : Signalement d'un COMMENTAIRE */}
                    {s.cible_type === "commentaire" && (
                      <p className="moderation-texte">
                        💬 « {s.cible.texte || "(vide)"} »
                      </p>
                    )}

                    {s.details && (
                      <p className="moderation-details">
                        <b>Motif du signalement :</b> {s.details}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="sub" style={{ marginBottom: 14 }}>
                  Contenu déjà supprimé par son auteur.
                </p>
              )}

              {/* Actions */}
              <div className="moderation-actions">
                <button
                  className="btn alt"
                  onClick={() => handleRemettre(s)}
                  disabled={remettreMutation.isPending}
                >
                  Remettre en ligne
                </button>
                <button
                  className="btn danger"
                  onClick={() => handleConfirmer(s)}
                  disabled={confirmerMutation.isPending}
                >
                  Confirmer la suspension
                </button>
                <button
                  className="btn"
                  onClick={() => handleSupprimer(s)}
                  disabled={supprDefinitiveMutation.isPending}
                  style={{ background: "#7A1A1A", color: "#fff" }}
                >
                  Supprimer définitivement
                </button>
              </div>
            </div>
          );
        })
      )}
    </>
  );
}
