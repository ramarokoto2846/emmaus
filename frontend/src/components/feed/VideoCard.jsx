import { useState, useRef, useEffect } from "react";
import {
  FiPlay,
  FiPause,
  FiVolume2,
  FiVolumeX,
  FiMaximize,
  FiCheckCircle,
} from "react-icons/fi";
import { enregistrerVue } from "../../api/endpoints";

const GRADIENTS = [
  "linear-gradient(135deg, #3A0B15, #8E2233)",
  "linear-gradient(135deg, #6B1626, #D4A233)",
  "linear-gradient(135deg, #4A0F1A, #B8872A)",
  "linear-gradient(135deg, #8E2233, #E3B94F)",
  "linear-gradient(135deg, #2A0F14, #A8323F)",
  "linear-gradient(135deg, #5A1220, #C8963A)",
];

function libelleType(type) {
  const map = {
    predication: "Prédication",
    temoignage: "Témoignage",
    louange: "Louange",
    enseignement: "Enseignement",
    court: "Court",
    replay_direct: "Replay direct",
  };
  return map[type] || type;
}

function formaterTemps(secondes) {
  if (!secondes || isNaN(secondes)) return "0:00";
  const m = Math.floor(secondes / 60);
  const s = Math.floor(secondes % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VideoCard({ video, index = 0, aspect = "16/9" }) {
  const [enLecture, setEnLecture] = useState(false);
  const [muet, setMuet] = useState(false);
  const [duree, setDuree] = useState(video.duree_secondes || 0);
  const [position, setPosition] = useState(0);
  const [chargement, setChargement] = useState(true);
  const [vueEnregistree, setVueEnregistree] = useState(false);
  const [nbVuesLocal, setNbVuesLocal] = useState(video.nb_vues || 0);

  const videoRef = useRef(null);
  const barreRef = useRef(null);

  const gradient = GRADIENTS[index % GRADIENTS.length];
  const fichierUrl = video.fichier_url;
  const miniatureUrl = video.miniature_url;
  const aUnVraiFichier = !!fichierUrl;

  // Reset quand on change de vidéo
  useEffect(() => {
    setVueEnregistree(false);
    setEnLecture(false);
    setPosition(0);
    setDuree(video.duree_secondes || 0);
    setChargement(true);
    setNbVuesLocal(video.nb_vues || 0);
  }, [video.id]);

  // Écoute des événements vidéo
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    function update() {
      setPosition(v.currentTime);
    }
    function onLoaded() {
      setDuree(v.duration || 0);
      setChargement(false);
    }
    function onError() {
      setChargement(false);
    }
    function onPlay() {
      setEnLecture(true);
    }
    function onPause() {
      setEnLecture(false);
    }

    v.addEventListener("timeupdate", update);
    v.addEventListener("loadedmetadata", onLoaded);
    v.addEventListener("error", onError);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);

    return () => {
      v.removeEventListener("timeupdate", update);
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("error", onError);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, [fichierUrl]);

  // Enregistrer la vue après 3 secondes de lecture
  useEffect(() => {
    if (!enLecture || vueEnregistree) return;

    console.log("⏱️ Vue sera enregistrée dans 3 secondes pour:", video.id);

    const timer = setTimeout(() => {
      console.log("📡 Enregistrement de la vue...");
      enregistrerVue(video.id, {
        duree_regardee_secondes: Math.round(position),
        position_reprise_secondes: Math.round(position),
        termine: false,
      })
        .then((res) => {
          console.log("✅ Vue enregistrée:", res);
          setNbVuesLocal(res.nb_vues);
          setVueEnregistree(true);
        })
        .catch((err) => {
          console.error("❌ Erreur vue:", err);
        });
    }, 3000);

    return () => clearTimeout(timer);
  }, [enLecture, vueEnregistree, position, video.id]);

  function toggleLecture(e) {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;

    if (v.paused) {
      v.play().catch((err) => console.error("Erreur play:", err));
    } else {
      v.pause();
    }
  }

  function toggleMuet(e) {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !muet;
      setMuet(!muet);
    }
  }

  function pleinEcran(e) {
    e.stopPropagation();
    if (videoRef.current?.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  }

  function chercher(e) {
    e.stopPropagation();
    const barre = barreRef.current;
    const v = videoRef.current;
    if (!barre || !v || !duree) return;

    const rect = barre.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    v.currentTime = ratio * duree;
    setPosition(v.currentTime);
  }

  const pourcentage = duree > 0 ? (position / duree) * 100 : 0;

  // --- Cas 1 : Vraie vidéo ---
  if (aUnVraiFichier) {
    return (
      <div className="vid-bloc">
        <div className="vid-reelle" style={{ aspectRatio: aspect }}>
          <video
            ref={videoRef}
            src={fichierUrl}
            poster={miniatureUrl || undefined}
            preload="metadata"
            playsInline
            onClick={(e) => e.stopPropagation()}
          />

          {chargement && (
            <div className="vid-loading">
              <div className="vid-spinner" />
            </div>
          )}

          {!enLecture && !chargement && (
            <button
              className="play-overlay"
              onClick={toggleLecture}
              aria-label="Lire"
            >
              <FiPlay size={28} />
            </button>
          )}

          <div className="vid-controls">
            <button onClick={toggleLecture} aria-label={enLecture ? "Pause" : "Lire"}>
              {enLecture ? <FiPause size={16} /> : <FiPlay size={16} />}
            </button>

            <button onClick={toggleMuet} aria-label={muet ? "Son" : "Muet"}>
              {muet ? <FiVolumeX size={16} /> : <FiVolume2 size={16} />}
            </button>

            <span className="vid-temps">{formaterTemps(position)}</span>

            <div className="vid-barre" ref={barreRef} onClick={chercher}>
              <div
                className="vid-barre-remplie"
                style={{ width: `${pourcentage}%` }}
              >
                <div className="vid-barre-pointe" />
              </div>
            </div>

            <span className="vid-temps">{formaterTemps(duree)}</span>

            <button onClick={pleinEcran} aria-label="Plein écran">
              <FiMaximize size={16} />
            </button>
          </div>
        </div>

        {/* Métadonnées sous la vidéo */}
        <div className="vid-meta">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h4 className="vid-meta-titre" style={{ flex: 1, margin: 0 }}>
              {video.titre}
            </h4>
            {video.est_verifiee && (
              <span
                className="badge-verifie badge-verifie-sm"
                title="Contenu vérifié par la modération"
              >
                <FiCheckCircle size={14} />
              </span>
            )}
          </div>
          <div className="vid-meta-infos">
            {video.auteur_nom && (
              <span className="vid-meta-auteur">{video.auteur_nom}</span>
            )}
            {video.type && (
              <span className="vid-meta-type">{libelleType(video.type)}</span>
            )}
            {duree > 0 && (
              <span className="vid-meta-duree">{formaterTemps(duree)}</span>
            )}
            <span className="vid-meta-vues">
              {nbVuesLocal} vue{nbVuesLocal > 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // --- Cas 2 : Décoration ---
  return (
    <div
      className="vid"
      style={{
        "--g": miniatureUrl ? `url(${miniatureUrl}) center/cover` : gradient,
        aspectRatio: aspect,
      }}
    >
      <span className="dur">{video.duree || "—"}</span>
      <span className="play">
        <svg className="i">
          <use href="#tri" />
        </svg>
      </span>
      <div className="vt">
        {video.titre}
        <small>
          {video.auteur_nom && `${video.auteur_nom} · `}
          {nbVuesLocal} vues
        </small>
      </div>
    </div>
  );
}
