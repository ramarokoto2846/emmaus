import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FiUploadCloud,
  FiCheckCircle,
  FiAlertCircle,
  FiFilm,
  FiX,
  FiArrowLeft,
} from "react-icons/fi";
import { uploadVideo } from "../api/endpoints";
import { useToast } from "../components/ui/Toast";

const TYPES = [
  { v: "predication", label: "Prédication" },
  { v: "temoignage", label: "Témoignage" },
  { v: "louange", label: "Louange" },
  { v: "enseignement", label: "Enseignement" },
  { v: "court", label: "Court" },
  { v: "replay_direct", label: "Replay direct" },
];

export default function PublierVideo() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { afficher: afficherToast } = useToast();
  const [fichier, setFichier] = useState(null);
  const [preview, setPreview] = useState(null);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState("idle");
  const [resultat, setResultat] = useState(null);
  const [erreur, setErreur] = useState("");
  const inputRef = useRef(null);

  const [form, setForm] = useState({
    titre: "",
    description: "",
    type: "predication",
    visibilite: "public",
  });

  const mutation = useMutation({
    mutationFn: (fd) => uploadVideo(fd, setProgress),
    onMutate: () => {
      setPhase("uploading");
      setProgress(0);
    },
    onSuccess: (data) => {
      setPhase("done");
      setResultat(data);
      qc.invalidateQueries({ queryKey: ["fil"] });
      qc.invalidateQueries({ queryKey: ["mes-videos"] });
      qc.invalidateQueries({ queryKey: ["mes-publications"] });
      afficherToast("Ta vidéo est en ligne dans le fil.", {
        type: "success",
        titre: "Vidéo publiée",
      });
    },
    onError: (e) => {
      setPhase("error");
      setErreur(e.response?.data?.detail || e.message || "Erreur d'upload");
    },
  });

  function choisirFichier(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFichier(f);
    setPreview(URL.createObjectURL(f));
    if (!form.titre) {
      const nom = f.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");
      setForm((x) => ({ ...x, titre: nom }));
    }
  }

  function uploader(e) {
    e.preventDefault();
    if (!fichier || !form.titre.trim()) return;
    const fd = new FormData();
    fd.append("fichier", fichier);
    fd.append("titre", form.titre.trim());
    fd.append("description", form.description);
    fd.append("type", form.type);
    fd.append("visibilite", form.visibilite);
    mutation.mutate(fd);
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <button className="back" onClick={() => navigate(-1)}>
        <FiArrowLeft size={16} style={{ marginRight: 6, verticalAlign: "middle" }} />
        Retour
      </button>

      <h1 className="vh">
        <FiFilm style={{ marginRight: 10, verticalAlign: "middle" }} />
        Publier une vidéo
      </h1>
      <p className="sub vs">
        Partage une prédication, un témoignage, une louange avec ta communauté.
      </p>

      <div className="card" style={{ padding: 24 }}>
        <form onSubmit={uploader} className="publier-video-form">
          {/* Zone de sélection */}
          {!fichier && (
            <div
              className="upload-dropzone"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) choisirFichier({ target: { files: [f] } });
              }}
            >
              <FiUploadCloud size={48} />
              <p>
                <b>Clique</b> ou <b>glisse</b> ta vidéo ici
              </p>
              <span className="sub">MP4, MOV, AVI — max 500 Mo</span>
              <input
                ref={inputRef}
                type="file"
                accept="video/*"
                style={{ display: "none" }}
                onChange={choisirFichier}
              />
            </div>
          )}

          {/* Aperçu */}
          {fichier && (
            <div className="upload-preview">
              <video src={preview} controls preload="metadata" />
              <div className="upload-preview-infos">
                <span>
                  <b>{fichier.name}</b>
                </span>
                <span className="sub">
                  {(fichier.size / 1024 / 1024).toFixed(1)} Mo
                </span>
                <button
                  type="button"
                  className="btn alt"
                  onClick={() => {
                    setFichier(null);
                    setPreview(null);
                  }}
                >
                  <FiX size={14} /> Changer
                </button>
              </div>
            </div>
          )}

          {/* Champs */}
          <div className="form-grid">
            <label className="form-field full">
              <span>Titre *</span>
              <input
                type="text"
                value={form.titre}
                onChange={set("titre")}
                required
                maxLength={160}
                placeholder="Donne un titre à ta vidéo"
                disabled={phase === "uploading"}
              />
            </label>

            <label className="form-field full">
              <span>Description</span>
              <textarea
                value={form.description}
                onChange={set("description")}
                rows={4}
                maxLength={500}
                placeholder="Décris ta vidéo…"
                disabled={phase === "uploading"}
              />
            </label>

            <label className="form-field">
              <span>Type</span>
              <select
                value={form.type}
                onChange={set("type")}
                disabled={phase === "uploading"}
              >
                {TYPES.map((t) => (
                  <option key={t.v} value={t.v}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>Visibilité</span>
              <select
                value={form.visibilite}
                onChange={set("visibilite")}
                disabled={phase === "uploading"}
              >
                <option value="public">Public</option>
                <option value="abonnes">Abonnés</option>
                <option value="prive">Privé</option>
              </select>
            </label>
          </div>

          {/* Progress */}
          {phase === "uploading" && (
            <div className="upload-progress">
              <div className="upload-progress-header">
                <FiUploadCloud size={18} />
                <span>Envoi en cours… {progress}%</span>
              </div>
              <div className="upload-bar">
                <i style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {/* Succès */}
          {phase === "done" && resultat && (
            <div className="upload-succes">
              <FiCheckCircle size={48} />
              <h4>Vidéo publiée</h4>
              <p className="sub">{resultat.titre}</p>
              <div className="upload-actions">
                <button
                  type="button"
                  className="btn alt"
                  onClick={() => {
                    setFichier(null);
                    setPreview(null);
                    setPhase("idle");
                    setResultat(null);
                    setForm({
                      titre: "",
                      description: "",
                      type: "predication",
                      visibilite: "public",
                    });
                  }}
                >
                  Publier une autre
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => navigate("/")}
                >
                  Voir dans le fil
                </button>
              </div>
            </div>
          )}

          {/* Erreur */}
          {phase === "error" && (
            <div className="upload-erreur">
              <FiAlertCircle size={24} />
              <span>{erreur}</span>
            </div>
          )}

          {/* Actions */}
          {phase !== "done" && (
            <div className="upload-actions">
              <button
                type="button"
                className="btn alt"
                onClick={() => navigate(-1)}
                disabled={phase === "uploading"}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="btn"
                disabled={
                  phase === "uploading" ||
                  !fichier ||
                  !form.titre.trim()
                }
              >
                {phase === "uploading" ? "Envoi…" : "Publier la vidéo"}
              </button>
            </div>
          )}
        </form>
      </div>
    </>
  );
}
