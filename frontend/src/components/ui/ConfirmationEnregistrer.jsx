import { createPortal } from "react-dom";
import { FiBookmark } from "react-icons/fi";

function ModalContenu({ dejaEnregistre, onConfirmer, onAnnuler }) {
  return (
    <div className="confirm-overlay" onClick={onAnnuler}>
      <div
        className="confirm-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-head">
          <div className="confirm-icon">
            <FiBookmark size={22} />
          </div>
          <h3>
            {dejaEnregistre
              ? "Retirer des enregistrements ?"
              : "Enregistrer ce contenu ?"}
          </h3>
        </div>

        <p className="sub">
          {dejaEnregistre
            ? "Ce contenu ne sera plus dans tes enregistrements."
            : "Tu pourras le retrouver dans l'onglet « Enregistrées » de ton mur."}
        </p>

        <div className="confirm-actions">
          <button className="btn alt" onClick={onAnnuler}>
            Annuler
          </button>
          <button
            className={`btn ${dejaEnregistre ? "danger" : ""}`}
            onClick={onConfirmer}
          >
            {dejaEnregistre ? "Retirer" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmationEnregistrer(props) {
  // Portal : rendu directement dans document.body pour éviter les
  // problèmes de z-index et d'overflow des parents
  return createPortal(<ModalContenu {...props} />, document.body);
}
