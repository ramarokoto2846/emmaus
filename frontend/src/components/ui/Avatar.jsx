export default function Avatar({
  profil,
  size = "md",
  colorA = "#E3B94F",
  colorB = "#8E2233",
  className = "",
}) {
  const initiales =
    profil?.initiales ||
    (profil?.nom_affiche
      ? profil.nom_affiche
          .split(" ")
          .map((w) => w[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()
      : "?");

  const sizeClass = size === "sm" ? "av sm" : "av";
  const url = profil?.avatar || profil?.avatar_url;

  if (url) {
    return (
      <img
        src={url}
        alt={profil?.nom_affiche || ""}
        className={`${sizeClass} ${className}`}
        style={{
          background: `linear-gradient(135deg, ${colorA}, ${colorB})`,
          objectFit: "cover",
        }}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} ${className}`}
      style={{ "--a": colorA, "--b": colorB }}
    >
      {initiales}
    </div>
  );
}
