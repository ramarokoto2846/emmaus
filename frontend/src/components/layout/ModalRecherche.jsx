import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  FiSearch,
  FiX,
  FiFilm,
  FiClock,
  FiFilter,
  FiChevronDown,
  FiUsers,
  FiUser,
} from "react-icons/fi";
import Avatar from "../ui/Avatar";
import NomUtilisateur from "../ui/NomUtilisateur";
import { videos, profils } from "../../api/endpoints";

const TYPES = [
  { v: "", label: "Tous les types" },
  { v: "predication", label: "Prédication" },
  { v: "temoignage", label: "Témoignage" },
  { v: "louange", label: "Louange" },
  { v: "enseignement", label: "Enseignement" },
  { v: "court", label: "Court" },
  { v: "replay_direct", label: "Replay direct" },
];

const DUREES = [
  { v: "", label: "Toutes les durées" },
  { v: "0-5", label: "Moins de 5 min" },
  { v: "5-15", label: "5 à 15 min" },
  { v: "15-30", label: "15 à 30 min" },
  { v: "30-60", label: "30 à 60 min" },
  { v: "60-", label: "Plus d'1 heure" },
];

const ROLES = [
  { v: "", label: "Tous les rôles" },
  { v: "membre", label: "Membre" },
  { v: "pasteur", label: "Pasteur" },
  { v: "moderateur", label: "Modérateur" },
  { v: "chaine_eglise", label: "Chaîne d'église" },
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

function formaterDuree(secondes) {
  if (!secondes) return "—";
  const m = Math.floor(secondes / 60);
  const s = secondes % 60;
  if (m < 60) return `${m}:${s.toString().padStart(2, "0")}`;
  const h = Math.floor(m / 60);
  return `${h}h${(m % 60).toString().padStart(2, "0")}`;
}

/* ============================================================
   DROPDOWN CUSTOM
   ============================================================ */
function Dropdown({ icone, label, options, valeur, onChange }) {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClicExterieur(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOuvert(false);
      }
    }
    if (ouvert) {
      document.addEventListener("mousedown", onClicExterieur);
      return () =>
        document.removeEventListener("mousedown", onClicExterieur);
    }
  }, [ouvert]);

  return (
    <div className="dropdown-filtre" ref={ref}>
      <button
        type="button"
        className="dropdown-filtre-btn"
        onClick={() => setOuvert((v) => !v)}
      >
        {icone}
        <span>{label}</span>
        <FiChevronDown
          size={14}
          style={{
            marginLeft: "auto",
            transform: ouvert ? "rotate(180deg)" : "none",
            transition: "transform 0.2s ease",
          }}
        />
      </button>

      {ouvert && (
        <div className="dropdown-filtre-list">
          {options.map((o) => (
            <button
              key={o.v}
              type="button"
              className={`dropdown-filtre-item ${o.v === valeur ? "on" : ""}`}
              onClick={() => {
                onChange(o.v);
                setOuvert(false);
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   COMPOSANT PRINCIPAL
   ============================================================ */
export default function ModalRecherche({ onClose }) {
  const navigate = useNavigate();

  // ✅ Onglet actif : "videos" ou "personnes"
  const [onglet, setOnglet] = useState("videos");

  // ---- État pour les vidéos ----
  const [titre, setTitre] = useState("");
  const [type, setType] = useState("");
  const [duree, setDuree] = useState("");
  const [titreDebounce, setTitreDebounce] = useState("");

  // ---- État pour les personnes ----
  const [nomPersonne, setNomPersonne] = useState("");
  const [role, setRole] = useState("");
  const [nomPersonneDebounce, setNomPersonneDebounce] = useState("");

  // Debounce pour vidéos
  useEffect(() => {
    const t = setTimeout(() => setTitreDebounce(titre), 300);
    return () => clearTimeout(t);
  }, [titre]);

  // Debounce pour personnes
  useEffect(() => {
    const t = setTimeout(() => setNomPersonneDebounce(nomPersonne), 300);
    return () => clearTimeout(t);
  }, [nomPersonne]);

  // ---- Params vidéos ----
  const paramsVideos = {};
  if (titreDebounce.trim()) paramsVideos.search = titreDebounce.trim();
  if (type) paramsVideos.type = type;
  if (duree) {
    const [min, max] = duree.split("-");
    if (min) paramsVideos.min_duree = min;
    if (max) paramsVideos.max_duree = max;
  }

  // ---- Params personnes ----
  const paramsPersonnes = {};
  if (nomPersonneDebounce.trim()) {
    paramsPersonnes.search = nomPersonneDebounce.trim();
  }
  if (role) paramsPersonnes.utilisateur__role = role;

  // ---- Requêtes ----
  const { data: videosData, isLoading: videosLoading } = useQuery({
    queryKey: ["recherche-videos", paramsVideos],
    queryFn: () => videos(paramsVideos),
    keepPreviousData: true,
    enabled: onglet === "videos",
  });

  const { data: profilsData, isLoading: profilsLoading } = useQuery({
    queryKey: ["recherche-profils", paramsPersonnes],
    queryFn: () => profils(paramsPersonnes),
    keepPreviousData: true,
    enabled: onglet === "personnes",
  });

  const resultatsVideos = videosData?.results || videosData || [];
  const resultatsProfils = profilsData?.results || profilsData || [];

  function allerVersVideo(id) {
    onClose();
    navigate(`/video/${id}`);
  }

  function allerVersProfil(id) {
    onClose();
    navigate(`/profil/${id}`);
  }

  // Fermer avec Échap
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function reinitialiser() {
    if (onglet === "videos") {
      setTitre("");
      setType("");
      setDuree("");
    } else {
      setNomPersonne("");
      setRole("");
    }
  }

  const filtreActif =
    onglet === "videos"
      ? titre || type || duree
      : nomPersonne || role;

  const labelType = TYPES.find((t) => t.v === type)?.label || "Tous les types";
  const labelDuree =
    DUREES.find((d) => d.v === duree)?.label || "Toutes les durées";
  const labelRole = ROLES.find((r) => r.v === role)?.label || "Tous les rôles";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card modal-recherche"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h3 style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <FiSearch size={18} />
            Recherche
          </h3>
          <button className="modal-close" onClick={onClose} aria-label="Fermer">
            <FiX size={20} />
          </button>
        </div>

        {/* ✅ Onglets : Vidéos / Personnes */}
        <div className="modal-recherche-onglets">
          <button
            className={`modal-recherche-onglet ${onglet === "videos" ? "on" : ""}`}
            onClick={() => setOnglet("videos")}
          >
            <FiFilm size={16} />
            Vidéos
          </button>
          <button
            className={`modal-recherche-onglet ${onglet === "personnes" ? "on" : ""}`}
            onClick={() => setOnglet("personnes")}
          >
            <FiUsers size={16} />
            Personnes
          </button>
        </div>

        <div className="modal-recherche-body">
          {/* ============================================================
              ONGLET VIDÉOS
             ============================================================ */}
          {onglet === "videos" && (
            <>
              <div className="modal-recherche-barre">
                <FiSearch size={16} />
                <input
                  type="text"
                  placeholder="Rechercher par titre ou description…"
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                  autoFocus
                />
                {titre && (
                  <button
                    onClick={() => setTitre("")}
                    className="modal-recherche-clear"
                    aria-label="Effacer"
                  >
                    <FiX size={14} />
                  </button>
                )}
              </div>

              <div className="modal-recherche-filtres">
                <Dropdown
                  icone={<FiFilm size={14} />}
                  label={labelType}
                  options={TYPES}
                  valeur={type}
                  onChange={setType}
                />
                <Dropdown
                  icone={<FiClock size={14} />}
                  label={labelDuree}
                  options={DUREES}
                  valeur={duree}
                  onChange={setDuree}
                />
                {filtreActif && (
                  <button
                    type="button"
                    className="btn alt"
                    onClick={reinitialiser}
                    style={{ fontSize: 13, padding: "8px 14px" }}
                  >
                    <FiX size={12} /> Réinitialiser
                  </button>
                )}
              </div>

              <div className="modal-recherche-resultats">
                {videosLoading ? (
                  <p className="sub" style={{ textAlign: "center", padding: 20 }}>
                    Recherche…
                  </p>
                ) : resultatsVideos.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 30 }}>
                    <FiFilter
                      size={32}
                      style={{ color: "var(--mute)", marginBottom: 8 }}
                    />
                    <p className="sub">
                      Aucune vidéo ne correspond à ces critères.
                    </p>
                  </div>
                ) : (
                  <>
                    <p
                      className="sub"
                      style={{
                        fontSize: 13,
                        marginBottom: 10,
                        padding: "0 4px",
                      }}
                    >
                      {resultatsVideos.length} résultat
                      {resultatsVideos.length > 1 ? "s" : ""}
                    </p>
                    {resultatsVideos.map((v) => (
                      <button
                        key={v.id}
                        className="modal-recherche-item"
                        onClick={() => allerVersVideo(v.id)}
                      >
                        <div
                          className="modal-recherche-thumb"
                          style={{
                            background: v.miniature_url
                              ? `url(${v.miniature_url}) center/cover`
                              : "linear-gradient(135deg, #4A0F1A, #8E2233)",
                          }}
                        >
                          <span className="modal-recherche-duree">
                            {formaterDuree(v.duree_secondes)}
                          </span>
                        </div>
                        <div className="modal-recherche-item-info">
                          <b>{v.titre}</b>
                          <small>
                            {v.auteur_nom && `${v.auteur_nom} · `}
                            <span
                              style={{
                                background: "var(--brandsoft)",
                                color: "var(--brand)",
                                padding: "1px 6px",
                                borderRadius: 4,
                                fontWeight: 600,
                              }}
                            >
                              {libelleType(v.type)}
                            </span>
                          </small>
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </div>
            </>
          )}

          {/* ============================================================
              ONGLET PERSONNES
             ============================================================ */}
          {onglet === "personnes" && (
            <>
              <div className="modal-recherche-barre">
                <FiUser size={16} />
                <input
                  type="text"
                  placeholder="Rechercher par nom, pseudo, ville…"
                  value={nomPersonne}
                  onChange={(e) => setNomPersonne(e.target.value)}
                  autoFocus
                />
                {nomPersonne && (
                  <button
                    onClick={() => setNomPersonne("")}
                    className="modal-recherche-clear"
                    aria-label="Effacer"
                  >
                    <FiX size={14} />
                  </button>
                )}
              </div>

              <div className="modal-recherche-filtres">
                <Dropdown
                  icone={<FiUsers size={14} />}
                  label={labelRole}
                  options={ROLES}
                  valeur={role}
                  onChange={setRole}
                />
                {filtreActif && (
                  <button
                    type="button"
                    className="btn alt"
                    onClick={reinitialiser}
                    style={{ fontSize: 13, padding: "8px 14px" }}
                  >
                    <FiX size={12} /> Réinitialiser
                  </button>
                )}
              </div>

              <div className="modal-recherche-resultats">
                {profilsLoading ? (
                  <p className="sub" style={{ textAlign: "center", padding: 20 }}>
                    Recherche…
                  </p>
                ) : resultatsProfils.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 30 }}>
                    <FiFilter
                      size={32}
                      style={{ color: "var(--mute)", marginBottom: 8 }}
                    />
                    <p className="sub">
                      Aucun profil ne correspond à ces critères.
                    </p>
                  </div>
                ) : (
                  <>
                    <p
                      className="sub"
                      style={{
                        fontSize: 13,
                        marginBottom: 10,
                        padding: "0 4px",
                      }}
                    >
                      {resultatsProfils.length} résultat
                      {resultatsProfils.length > 1 ? "s" : ""}
                    </p>
                    {resultatsProfils.map((p) => (
                      <button
                        key={p.id}
                        className="modal-recherche-item"
                        onClick={() => allerVersProfil(p.id)}
                      >
                        <Avatar profil={p} size="sm" />
                        <div className="modal-recherche-item-info">
                          <NomUtilisateur profil={p} taille="sm" />
                          <small>
                            {p.sous_titre ||
                              p.ville ||
                              `@${p.pseudo}` ||
                              "Membre Emmaüs"}
                          </small>
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}