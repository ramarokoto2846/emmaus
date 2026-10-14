import { useNavigate } from "react-router-dom";
import Avatar from "../ui/Avatar";

export default function ListeProfils({ titre, profils, onClose }) {
  const navigate = useNavigate();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{titre}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {!profils ? (
            <p className="sub">Chargement…</p>
          ) : profils.length === 0 ? (
            <p className="sub">Aucun profil.</p>
          ) : (
            profils.map((p) => (
              <button
                key={p.id}
                className="row"
                onClick={() => {
                  navigate(`/profil/${p.id}`);
                  onClose();
                }}
              >
                <Avatar profil={p} size="sm" />
                <div>
                  <b>{p.nom_affiche}</b>
                  <small>{p.sous_titre || p.ville || "Membre Emmaüs"}</small>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
