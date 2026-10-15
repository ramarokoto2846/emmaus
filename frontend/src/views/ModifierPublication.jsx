import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FiFilm,
  FiArrowLeft,
  FiSave,
  FiAlertTriangle,
  FiVideo,
  FiLock,
} from "react-icons/fi";
import {
  publication as getPublication,
  majPublication,
  majVideo,
} from "../api/endpoints";
import { useToast } from "../components/ui/Toast";

const TYPES = [
  { v: "predication", label: "Prédication" },
  { v: "temoignage", label: "Témoignage" },
  { v: "louange", label: "Louange" },
  { v: "enseignement", label: "Enseignement" },
  { v: "court", label: "Court" },
  { v: "replay_direct", label: "Replay direct" },
];

export default function ModifierPublication() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { afficher: afficherToast } = useToast();

  const [form, setForm] = useState({
    titre: "",
    description: "",
    type: "predication",
    visibilite: "public",
    texte: "",
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["publication", id],
    queryFn: () => getPublication(id),
  });

  useEffect(() => {
    if (!data) return;
    setForm({
      titre: data.video?.titre || "",
      description: data.video?.description || "",
      type: data.video?.type || "predication",
      visibilite: data.visibilite || "public",
      texte: data.texte || "",
    });
  }, [data]);

  const majMutation = useMutation({
    mutationFn: async () => {
      if (data?.video?.id) {
        await majVideo(data.video.id, {
          titre: form.titre.trim(),
          description: form.description,
          type: form.type,
        });
      }
      return majPublication(id, {
        texte: form.texte,
        visibilite: form.visibilite,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["publication", id] });
      qc.invalidateQueries({ queryKey: ["fil"] });
      qc.invalidateQueries({ queryKey: ["mes-publications"] });
      qc.invalidateQueries({ queryKey: ["mes-videos"] });
      qc.invalidateQueries({ queryKey: ["videos"] });
      afficherToast("Publication modifiée avec succès.", {
        type: "success",
        titre: "Modifiée",
      });
      navigate(`/publication/${id}`);
    },
    onError: (err) => {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.titre?.[0] ||
        "Erreur lors de la modification.";
      afficherToast(msg, { type: "error", titre: "Erreur" });
    },
  });

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  if (isLoading) return <p className="sub">Chargement…</p>;

  if (error || !data) {
    return (
      <div className="card" style={{ padding: 40, textAlign: "center" }}>
        <FiAlertTriangle
          size={48}
          style={{ color: "var(--live)", marginBottom: 12 }}
        />
        <p className="sub">Publication introuvable.</p>
        <button
          className="btn alt"
          onClick={() => navigate("/")}
          style={{ marginTop: 16 }}
        >
          Retour au fil
        </button>
      </div>
    );
  }

  const aVideo = !!data.video;
  const estVerifiee = data.est_verifiee === true;
  const peutEnregistrer =
    !majMutation.isPending &&
    (!aVideo || form.titre.trim()) &&
    (aVideo || form.texte.trim());

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
        <FiFilm style={{ marginRight: 10, verticalAlign: "middle" }} />
        Modifier la publication
      </h1>
      <p className="sub vs">
        Modifie le titre, la description, le type ou la visibilité de ta
        publication.
      </p>

      {estVerifiee && (
        <div className="alerte-masquee" style={{ marginBottom: 20 }}>
          <FiAlertTriangle size={18} />
          <div>
            <b>Tu vas perdre le badge « Vérifié »</b>
            <p>
              Cette publication a été approuvée par un modérateur. En la
              modifiant, elle redeviendra signalable et devra être réexaminée
              avant de récupérer son badge.
            </p>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 24 }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (peutEnregistrer) majMutation.mutate();
          }}
          className="publier-video-form"
        >
          {aVideo && (
            <div className="form-field full" style={{ marginBottom: 4 }}>
              <span>
                <FiVideo
                  size={14}
                  style={{ marginRight: 6, verticalAlign: "middle" }}
                />
                Vidéo actuelle
              </span>
              <div
                className="upload-preview"
                style={{
                  borderRadius: 14,
                  overflow: "hidden",
                  background: "#000",
                  marginTop: 8,
                }}
              >
                <video
                  src={data.video.fichier_url}
                  poster={data.video.miniature_url || undefined}
                  controls
                  preload="metadata"
                  style={{ width: "100%", maxHeight: 340, display: "block" }}
                />
              </div>
              <p
                className="sub"
                style={{
                  fontSize: 12.5,
                  marginTop: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: "var(--mute)",
                }}
              >
                <FiLock size={12} />
                La vidéo ne peut pas être remplacée après publication.
              </p>
            </div>
          )}

          <div className="form-grid">
            {aVideo && (
              <label className="form-field full">
                <span>
                  Titre <b style={{ color: "var(--live)" }}>*</b>
                </span>
                <input
                  type="text"
                  value={form.titre}
                  onChange={set("titre")}
                  required
                  maxLength={160}
                  placeholder="Donne un titre à ta vidéo"
                  disabled={majMutation.isPending}
                />
              </label>
            )}

            {aVideo && (
              <label className="form-field full">
                <span>Description</span>
                <textarea
                  value={form.description}
                  onChange={set("description")}
                  rows={4}
                  maxLength={500}
                  placeholder="Décris ta vidéo…"
                  disabled={majMutation.isPending}
                />
              </label>
            )}

            {aVideo && (
              <label className="form-field">
                <span>Type</span>
                <select
                  value={form.type}
                  onChange={set("type")}
                  disabled={majMutation.isPending}
                >
                  {TYPES.map((t) => (
                    <option key={t.v} value={t.v}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className={`form-field ${!aVideo ? "full" : ""}`}>
              <span>Visibilité</span>
              <select
                value={form.visibilite}
                onChange={set("visibilite")}
                disabled={majMutation.isPending}
              >
                <option value="public">Public</option>
                <option value="abonnes">Abonnés</option>
                <option value="prive">Privé</option>
              </select>
            </label>

            <label className="form-field full">
              <span>{aVideo ? "Légende" : "Texte de la publication"}</span>
              <textarea
                value={form.texte}
                onChange={set("texte")}
                rows={5}
                maxLength={2000}
                placeholder={
                  aVideo
                    ? "Ajoute une légende à ta vidéo…"
                    : "Écris ton message…"
                }
                disabled={majMutation.isPending}
              />
            </label>
          </div>

          <div className="upload-actions">
            <button
              type="button"
              className="btn alt"
              onClick={() => navigate(-1)}
              disabled={majMutation.isPending}
            >
              Annuler
            </button>
            <button type="submit" className="btn" disabled={!peutEnregistrer}>
              <FiSave size={16} />
              {majMutation.isPending ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}