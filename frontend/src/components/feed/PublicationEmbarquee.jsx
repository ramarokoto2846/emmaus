import { useNavigate } from "react-router-dom";
import Avatar from "../ui/Avatar";
import NomUtilisateur from "../ui/NomUtilisateur";
import VideoCard from "./VideoCard";
import Icon from "../ui/Icon";
import { formatRelative } from "../../utils/format";

/**
 * Bloc gris de la publication originale (style Facebook embed).
 * Cliquable : mène vers la publication originale.
 */
export default function PublicationEmbarquee({ origine }) {
  const navigate = useNavigate();

  if (!origine) return null;

  function allerVersOriginal() {
    navigate(`/publication/${origine.id}`);
  }

  return (
    <div
      className="fb-embed"
      onClick={allerVersOriginal}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") allerVersOriginal();
      }}
    >
      {/* En-tête : auteur + date */}
      <div className="fb-embed-header">
        <Avatar profil={origine.auteur} size="sm" />
        <div className="fb-embed-header-info">
          <NomUtilisateur profil={origine.auteur} taille="sm" />
          <small>{formatRelative(origine.cree_le)}</small>
        </div>
      </div>

      {/* Texte original */}
      {origine.texte && <p className="fb-embed-texte">{origine.texte}</p>}

      {/* Vidéo */}
      {origine.video && (
        <div
          className="fb-embed-media"
          onClick={(e) => e.stopPropagation()}
        >
          <VideoCard video={origine.video} aspect="16/9" />
        </div>
      )}

      {/* Verset */}
      {origine.verset && (
        <div className="fb-embed-verset">
          <div className="fb-embed-verset-ref">
            <Icon name="book" />
            <b>{origine.verset.reference}</b>
          </div>
          <p>« {origine.verset.texte} »</p>
        </div>
      )}

      {/* Compteurs de l'original */}
      <div className="fb-embed-compteurs">
        <span className="fb-compteur">
          <Icon name="flame" />
          <b>{origine.nb_amen || 0}</b>
        </span>
        <span className="fb-compteur">
          <Icon name="chat" />
          <b>{origine.nb_commentaires || 0}</b>
        </span>
        <span className="fb-compteur">
          <Icon name="share" />
          <b>{origine.nb_partages || 0}</b>
        </span>
      </div>
    </div>
  );
}
