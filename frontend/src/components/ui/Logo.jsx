export default function Logo({ size = 80, withText = true, className = "" }) {
  return (
    <div className={`logo-auth ${className}`}>
      <img
        src="/media/logo/logo.png"
        alt="Emmaüs"
        style={{
          width: size,
          height: size,
          objectFit: "contain",
        }}
        onError={(e) => {
          // Fallback si le logo ne charge pas
          e.target.style.display = "none";
        }}
      />
      {withText && <h1>Emmaüs</h1>}
      {withText && (
        <p className="logo-tagline">
          La route, la Parole, la communauté
        </p>
      )}
    </div>
  );
}
