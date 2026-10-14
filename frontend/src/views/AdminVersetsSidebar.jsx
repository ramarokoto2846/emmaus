import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FiCheck, FiPlus, FiX, FiTrash2, FiBookOpen } from "react-icons/fi";
import { useConfirmation } from "../components/ui/Confirmation";
import {
  versets,
  toggleVersetSidebar,
  versetsSidebar,
  creerVerset,
  supprimerVerset,
} from "../api/endpoints";

const LIVRES = [
  "Genèse", "Exode", "Lévitique", "Nombres", "Deutéronome",
  "Josué", "Juges", "Ruth", "1 Samuel", "2 Samuel", "1 Rois", "2 Rois",
  "1 Chroniques", "2 Chroniques", "Esdras", "Néhémie", "Esther",
  "Job", "Psaumes", "Proverbes", "Ecclésiaste", "Cantique des cantiques",
  "Ésaïe", "Jérémie", "Lamentations", "Ézéchiel", "Daniel",
  "Osée", "Joël", "Amos", "Abdias", "Jonas", "Michée", "Nahum",
  "Habacuc", "Sophonie", "Aggée", "Zacharie", "Malachie",
  "Matthieu", "Marc", "Luc", "Jean", "Actes", "Romains",
  "1 Corinthiens", "2 Corinthiens", "Galates", "Éphésiens", "Philippiens",
  "Colossiens", "1 Thessaloniciens", "2 Thessaloniciens",
  "1 Timothée", "2 Timothée", "Tite", "Philémon", "Hébreux",
  "Jacques", "1 Pierre", "2 Pierre", "1 Jean", "2 Jean", "3 Jean",
  "Jude", "Apocalypse",
];

const TRADUCTIONS = ["LSG", "NEG", "S21", "BDS", "PDV", "TOB", "Darby", "KJV", "NIV"];

const FORM_INITIAL = {
  livre: "",
  chapitre: 1,
  verset_debut: 1,
  verset_fin: 1,
  traduction: "LSG",
  texte: "",
  actif_sidebar: true,
};

export default function AdminVersetsSidebar() {
  const qc = useQueryClient();
  const confirmer = useConfirmation();

  const [recherche, setRecherche] = useState("");
  const [formOuvert, setFormOuvert] = useState(false);
  const [form, setForm] = useState(FORM_INITIAL);
  const [message, setMessage] = useState("");

  // Versets actifs
  const { data: actifs, isLoading: chargementActifs } = useQuery({
    queryKey: ["versets-sidebar"],
    queryFn: versetsSidebar,
  });

  // Recherche
  const { data: resultats } = useQuery({
    queryKey: ["versets-recherche", recherche],
    queryFn: () => versets({ search: recherche }),
    enabled: recherche.length >= 2,
  });

  const toggleMutation = useMutation({
    mutationFn: (id) => toggleVersetSidebar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["versets-sidebar"] }),
  });

  const creerMutation = useMutation({
    mutationFn: (data) => creerVerset(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["versets-sidebar"] });
      qc.invalidateQueries({ queryKey: ["versets-recherche"] });
      setForm(FORM_INITIAL);
      setFormOuvert(false);
      flash("Verset créé et ajouté à la sidebar ✅");
    },
    onError: (err) => {
      const detail = err.response?.data?.details || err.response?.data;
      alert(
        "Erreur : " +
          (typeof detail === "object"
            ? Object.entries(detail)
                .map(([k, v]) => `${k}: ${[].concat(v).join(", ")}`)
                .join(" | ")
            : err.message)
      );
    },
  });

  const supprMutation = useMutation({
    mutationFn: (id) => supprimerVerset(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["versets-sidebar"] });
      qc.invalidateQueries({ queryKey: ["versets-recherche"] });
    },
  });

  function flash(msg) {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  }

  async function supprimer(id, reference) {
    const ok = await confirmer({
      titre: "Supprimer ce verset ?",
      message: `« ${reference} » sera retiré définitivement de la base.`,
      labelConfirmer: "Supprimer",
      danger: true,
    });
    if (ok) supprMutation.mutate(id);
  }

  function setChamp(k) {
    return (e) => {
      const val = e.target.value;
      setForm((f) => ({ ...f, [k]: val }));
    };
  }

  function setNum(k) {
    return (e) => {
      const val = parseInt(e.target.value, 10) || 0;
      setForm((f) => ({ ...f, [k]: val }));
    };
  }

  function envoyerCreation(e) {
    e.preventDefault();
    const data = {
      livre: form.livre,
      chapitre: parseInt(form.chapitre, 10),
      verset_debut: parseInt(form.verset_debut, 10),
      verset_fin: parseInt(form.verset_fin, 10),
      traduction: form.traduction,
      texte: form.texte.trim(),
      actif_sidebar: form.actif_sidebar,
    };
    if (!data.livre || !data.texte) return;
    creerMutation.mutate(data);
  }

  const listeActifs = actifs || [];
  const listeResultats = resultats?.results || resultats || [];
  const estActif = (id) => listeActifs.some((v) => v.id === id);

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <h1 className="vh">Versets de la sidebar</h1>
        <button
          className="btn fl"
          onClick={() => setFormOuvert((v) => !v)}
        >
          <FiPlus size={16} />
          {formOuvert ? "Fermer" : "Nouveau verset"}
        </button>
      </div>

      <p className="sub vs">
        Les versets actifs tournent automatiquement toutes les 60 secondes dans
        la sidebar. Active/désactive ceux qui existent, ou crée-en de nouveaux.
      </p>

      {message && (
        <div
          style={{
            background: "#e8f5e9",
            color: "#2e7d32",
            padding: "12px 16px",
            borderRadius: 12,
            marginBottom: 16,
            fontSize: 14,
          }}
        >
          {message}
        </div>
      )}

      {/* Formulaire de création */}
      {formOuvert && (
        <form
          onSubmit={envoyerCreation}
          className="card"
          style={{ padding: 24, marginBottom: 24 }}
        >
          <h3 style={{ marginBottom: 16 }}>
            <FiBookOpen style={{ marginRight: 6, verticalAlign: "middle" }} />
            Créer un nouveau verset
          </h3>

          <div className="form-grid">
            <label className="form-field">
              <span>Livre *</span>
              <select
                value={form.livre}
                onChange={setChamp("livre")}
                required
              >
                <option value="">— Choisir —</option>
                {LIVRES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>Traduction *</span>
              <select
                value={form.traduction}
                onChange={setChamp("traduction")}
                required
              >
                {TRADUCTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>Chapitre *</span>
              <input
                type="number"
                min="1"
                value={form.chapitre}
                onChange={setNum("chapitre")}
                required
              />
            </label>

            <label className="form-field">
              <span>Verset début *</span>
              <input
                type="number"
                min="1"
                value={form.verset_debut}
                onChange={setNum("verset_debut")}
                required
              />
            </label>

            <label className="form-field">
              <span>Verset fin *</span>
              <input
                type="number"
                min="1"
                value={form.verset_fin}
                onChange={setNum("verset_fin")}
                required
              />
            </label>

            <label className="form-field" style={{ alignSelf: "end" }}>
              <span style={{ opacity: 0.7 }}>Actif dans la sidebar</span>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  paddingTop: 8,
                }}
              >
                <input
                  type="checkbox"
                  checked={form.actif_sidebar}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      actif_sidebar: e.target.checked,
                    }))
                  }
                />
                <span style={{ fontSize: 14 }}>Oui</span>
              </label>
            </label>

            <label className="form-field full">
              <span>Texte du verset *</span>
              <textarea
                value={form.texte}
                onChange={setChamp("texte")}
                rows={4}
                required
                placeholder="Ex : Ta parole est une lampe à mes pieds…"
              />
            </label>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
              marginTop: 20,
            }}
          >
            <button
              type="button"
              className="btn alt"
              onClick={() => {
                setForm(FORM_INITIAL);
                setFormOuvert(false);
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="btn"
              disabled={creerMutation.isPending || !form.livre || !form.texte.trim()}
            >
              {creerMutation.isPending ? "Création…" : "Créer le verset"}
            </button>
          </div>
        </form>
      )}

      {/* Versets actifs */}
      <h3 style={{ marginBottom: 12 }}>
        Versets actifs ({listeActifs.length})
      </h3>

      {chargementActifs ? (
        <p className="sub">Chargement…</p>
      ) : listeActifs.length === 0 ? (
        <p className="sub" style={{ marginBottom: 24 }}>
          Aucun verset actif. Crée-en un ou active-en un existant ci-dessous.
        </p>
      ) : (
        <div style={{ marginBottom: 24 }}>
          {listeActifs.map((v) => (
            <div
              key={v.id}
              className="card"
              style={{
                padding: 14,
                marginBottom: 8,
                display: "flex",
                gap: 12,
                alignItems: "center",
              }}
            >
              <div style={{ flex: 1 }}>
                <b>{v.reference}</b>
                <span className="sub" style={{ marginLeft: 8, fontSize: 12 }}>
                  {v.traduction}
                </span>
                <div className="sub" style={{ fontSize: 13 }}>
                  {v.texte.slice(0, 80)}
                  {v.texte.length > 80 ? "…" : ""}
                </div>
              </div>
              <button
                className="btn alt"
                onClick={() => toggleMutation.mutate(v.id)}
                disabled={toggleMutation.isPending}
                style={{ fontSize: 13, padding: "6px 14px" }}
                title="Retirer de la sidebar"
              >
                <FiX size={14} /> Retirer
              </button>
              <button
                className="btn alt"
                onClick={() => supprimer(v.id, v.reference)}
                disabled={supprMutation.isPending}
                style={{
                  fontSize: 13,
                  padding: "6px 10px",
                  color: "var(--live)",
                }}
                title="Supprimer définitivement"
              >
                <FiTrash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Recherche */}
      <h3 style={{ marginBottom: 12 }}>Ajouter un verset existant</h3>
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div className="form-field">
          <span>Rechercher un verset</span>
          <input
            type="text"
            placeholder="Ex : Luc, Psaumes, Jean 3…"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
          />
        </div>

        {recherche.length >= 2 && (
          <div
            style={{
              marginTop: 12,
              maxHeight: 300,
              overflowY: "auto",
              borderRadius: 12,
              border: "1px solid var(--line)",
            }}
          >
            {listeResultats.length === 0 ? (
              <p className="sub" style={{ padding: 12 }}>
                Aucun verset trouvé. Tu peux en créer un avec le bouton
                « Nouveau verset ».
              </p>
            ) : (
              listeResultats.slice(0, 30).map((v) => {
                const actif = estActif(v.id);
                return (
                  <button
                    key={v.id}
                    onClick={() => !actif && toggleMutation.mutate(v.id)}
                    disabled={actif}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "12px 16px",
                      borderBottom: "1px solid var(--line)",
                      opacity: actif ? 0.5 : 1,
                      cursor: actif ? "default" : "pointer",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <b>{v.reference}</b>
                      {actif ? (
                        <FiCheck size={16} style={{ color: "var(--brand)" }} />
                      ) : (
                        <FiPlus size={16} style={{ color: "var(--mute)" }} />
                      )}
                    </div>
                    <div className="sub" style={{ fontSize: 13 }}>
                      {v.texte.slice(0, 80)}
                      {v.texte.length > 80 ? "…" : ""}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </>
  );
}
