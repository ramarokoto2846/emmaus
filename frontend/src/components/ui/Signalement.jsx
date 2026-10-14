import { useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FiFlag, FiX } from "react-icons/fi";
import { signaler } from "../../api/endpoints";

const MOTIFS = [
  {
    v: "non_evangelique",
    label: "Non évangélique",
    desc: "Contenu contraire à la foi chrétienne",
  },
  {
    v: "harcelement",
    label: "Harcèlement",
    desc: "Intimidation, menaces, insultes répétées",
  },
  {
    v: "contenu_sexuel",
    label: "Contenu sexuel",
    desc: "Image ou texte impudique",
  },
  {
    v: "haine",
    label: "Discours de haine",
    desc: "Attaque envers un groupe ou une personne",
  },
  {
    v: "fausse_info",
    label: "Fausse doctrine",
    desc: "Enseignement trompeur ou hérétique",
  },
  {
    v: "spam",
    label: "Spam / publicité",
    desc: "Contenu répétitif ou promotionnel",
  },
  {
    v: "droits_auteur",
    label: "Droits d'auteur",
    desc: "Contenu utilisé sans autorisation",
  },
  {
    v: "autre",
    label: "Autre",
    desc: "Précisez dans le champ ci-dessous",
  },
];

function ModalSignalement({ cibleType, cibleId, onClose }) {
  const qc = useQueryClient();
  const [motif, setMotif] = useState("");
  const [details, setDetails] = useState("");
  const [merci, setMerci] = useState(false);

  const mutation = useMutation({
    mutationFn: (data) => signaler(data),
    onSuccess: () => {
      setMerci(true);
      qc.invalidateQueries({ queryKey: ["signalements"] });
      qc.invalidateQueries({ queryKey: ["commentaires"] });
      qc.invalidateQueries({ queryKey: ["fil"] });
      qc.invalidateQueries({ queryKey: ["mes-publications"] });
      qc.invalidateQueries({ queryKey: ["publications-profil"] });
      qc.invalidateQueries({ queryKey: ["videos"] });
      setTimeout(() => {
        onClose();
      }, 1800);
    },
    onError: (err) => {
      alert("Erreur : " + (err.response?.data?.detail || err.message));
    },
  });

  function envoyer() {
    if (!motif) return;
    mutation.mutate({
      cible_type: cibleType,
      cible_id: cibleId,
      motif,
      details,
    });
  }

  if (merci) {
    return (
      <div className="signal-overlay" onClick={onClose}>
        <div
          className="signal-card"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="signal-merci">
            <div className="signal-merci-icon">🙏</div>
            <h3>Merci pour ton signalement</h3>
            <p className="sub">
              Notre équipe de modération va examiner ce contenu dans les plus
              brefs délais.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="signal-overlay" onClick={onClose}>
      <div
        className="signal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h3>
            <FiFlag
              size={18}
              style={{ marginRight: 8, verticalAlign: "middle" }}
            />
            Signaler ce contenu
          </h3>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Fermer"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="signal-body">
          <p className="sub" style={{ marginBottom: 16 }}>
            Choisis le motif qui correspond le mieux. Ton signalement est
            anonyme.
          </p>

          <div className="signal-motifs">
            {MOTIFS.map((m) => (
              <button
                key={m.v}
                className={`signal-motif ${motif === m.v ? "on" : ""}`}
                onClick={() => setMotif(m.v)}
              >
                <span className="signal-motif-label">{m.label}</span>
                <span className="signal-motif-desc">{m.desc}</span>
              </button>
            ))}
          </div>

          <label className="form-field" style={{ marginTop: 16 }}>
            <span>Détails (optionnel)</span>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Ajoute des précisions si nécessaire…"
            />
          </label>

          <div className="signal-actions">
            <button className="btn alt" onClick={onClose}>
              Annuler
            </button>
            <button
              className="btn danger"
              onClick={envoyer}
              disabled={!motif || mutation.isPending}
            >
              {mutation.isPending ? "Envoi…" : "Envoyer le signalement"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Signalement({ cibleType, cibleId, onClose }) {
  // Utilise un portal pour rendre la modal directement dans document.body
  // Ceci évite les problèmes de z-index / overflow hérités
  return createPortal(
    <ModalSignalement
      cibleType={cibleType}
      cibleId={cibleId}
      onClose={onClose}
    />,
    document.body
  );
}
