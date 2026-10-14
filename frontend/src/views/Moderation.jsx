import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FiCheck, FiAlertTriangle } from "react-icons/fi";
import Avatar from "../components/ui/Avatar";
import { useConfirmation } from "../components/ui/Confirmation";
import {
  moderationSignalements,
  moderationRemettre,
  moderationConfirmer,
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

export default function Moderation() {
  const qc = useQueryClient();
  const confirmer = useConfirmation();

  const { data, isLoading, error } = useQuery({
    queryKey: ["moderation-signalements"],
    queryFn: moderationSignalements,
    refetchInterval: 30_000,
  });

  const remettreMutation = useMutation({
    mutationFn: (id) => moderationRemettre(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["moderation-signalements"] }),
  });

  const confirmerMutation = useMutation({
    mutationFn: (id) => moderationConfirmer(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["moderation-signalements"] }),
  });

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
          <FiCheck
            size={48}
            style={{ color: "var(--brand)", marginBottom: 12 }}
          />
          <p className="sub">Aucun signalement en attente. Tout est en ordre !</p>
        </div>
      ) : (
        liste.map((s) => (
          <div
            key={s.id}
            className="card"
            style={{ padding: 20, marginBottom: 16 }}
          >
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "rgba(200, 40, 60, 0.12)",
                  color: "var(--live)",
                  display: "grid",
                  placeItems: "center",
                  flex: "none",
                }}
              >
                <FiAlertTriangle size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <b>{MOTIFS[s.motif] || s.motif}</b>
                <div className="sub" style={{ fontSize: 13 }}>
                  Signalé par <b>{s.auteur_signalement?.nom_affiche}</b> ·{" "}
                  {formatRelative(s.cree_le)}
                </div>
              </div>
              {s.nb_signalements > 1 && (
                <span
                  style={{
                    background: "var(--live)",
                    color: "#fff",
                    borderRadius: 99,
                    padding: "3px 10px",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {s.nb_signalements}
                </span>
              )}
            </div>

            {s.cible ? (
              <div
                style={{
                  background: "var(--bg)",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  <Avatar
                    profil={{
                      nom_affiche: s.cible.auteur?.nom_affiche || "?",
                      initiales: s.cible.auteur?.nom_affiche?.[0] || "?",
                    }}
                    size="sm"
                  />
                  <div>
                    <b>{s.cible.auteur?.nom_affiche}</b>
                    <div className="sub" style={{ fontSize: 12 }}>
                      Auteur du {s.cible_type}
                    </div>
                  </div>
                </div>
                <p style={{ margin: 0, lineHeight: 1.5 }}>
                  {s.cible.texte || s.cible.titre || "(sans texte)"}
                </p>
                {s.details && (
                  <p
                    className="sub"
                    style={{
                      marginTop: 10,
                      fontStyle: "italic",
                      fontSize: 13,
                    }}
                  >
                    Détails : {s.details}
                  </p>
                )}
              </div>
            ) : (
              <p className="sub" style={{ marginBottom: 14 }}>
                Contenu déjà supprimé par son auteur.
              </p>
            )}

            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
                flexWrap: "wrap",
              }}
            >
              <button
                className="btn alt"
                onClick={() => handleRemettre(s)}
                disabled={remettreMutation.isPending}
              >
                Remettre en ligne
              </button>
              <button
                className="btn"
                onClick={() => handleConfirmer(s)}
                disabled={confirmerMutation.isPending}
                style={{ background: "var(--live)", color: "#fff" }}
              >
                Confirmer la suspension
              </button>
            </div>
          </div>
        ))
      )}
    </>
  );
}
