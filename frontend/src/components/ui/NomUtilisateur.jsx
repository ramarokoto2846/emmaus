import BadgeModerateur from "./BadgeModerateur";
import BadgeAdmin from "./BadgeAdmin";

function Badge({ variant, size = 16, title, niveau }) {
  // ✅ Badge modérateur : composant dédié avec progression
  if (variant === "moderateur") {
    return <BadgeModerateur size={size} niveau={niveau || 1} />;
  }

  // ✅ Badge admin : composant dédié avec couronne
  if (variant === "admin") {
    return <BadgeAdmin size={size} />;
  }

  const styles = {
    pasteur: {
      bg: "linear-gradient(135deg, #5A1220 0%, #2A0F14 50%, #1A0A0E 100%)",
      color: "#E3B94F",
      shadow: "0 2px 8px rgba(42, 15, 20, 0.5)",
    },
    chaine_eglise: {
      bg: "linear-gradient(135deg, #B8872A 0%, #8E2233 50%, #5A1220 100%)",
      color: "#FBF1EC",
      shadow: "0 2px 8px rgba(139, 90, 0, 0.4)",
    },
  };

  const s = styles[variant] || styles.pasteur;

  return (
    <span
      className={`badge-role badge-role-${variant}`}
      style={{
        width: size,
        height: size,
        background: s.bg,
        color: s.color,
        boxShadow: s.shadow,
      }}
      title={title}
      aria-label={title}
    >
      <svg
        viewBox="0 0 24 24"
        width={size * 0.62}
        height={size * 0.62}
        fill="currentColor"
      >
        <path d="M12 2c0 4-3 6-3 10a3 3 0 0 0 6 0c0-1.5-1-2.5-1-4 0 2 1.5 3 2.5 4.5S18 15 18 16a6 6 0 1 1-12 0c0-5 6-8 6-14z" />
      </svg>
    </span>
  );
}

export default function NomUtilisateur({
  profil,
  className = "",
  taille = "md",
}) {
  if (!profil) return null;

  const nom = profil.nom_affiche || profil.pseudo || "Utilisateur";
  const role = profil.role;
  const niveauMod = profil.niveau_moderateur || 1;

  const badgeSize = taille === "sm" ? 15 : 18;

  return (
    <span className="nom-utilisateur">
      <span
        className={`nom-utilisateur-texte ${className}`}
        title={nom}
      >
        {nom}
      </span>

      {role === "admin" && <Badge variant="admin" size={badgeSize} />}
      {role === "moderateur" && (
        <Badge
          variant="moderateur"
          size={badgeSize}
          niveau={niveauMod}
          title="Modérateur"
        />
      )}
      {role === "pasteur" && (
        <Badge variant="pasteur" size={badgeSize} title="Pasteur" />
      )}
      {role === "chaine_eglise" && (
        <Badge variant="chaine_eglise" size={badgeSize} title="Église" />
      )}
    </span>
  );
}