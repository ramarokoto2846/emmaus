import Icon from "./Icon";

/**
 * Bouton stylé de la maquette.
 *
 * variant: "default" | "alt" | "fl"
 * icon: nom de l'icône (optionnel)
 */
export default function Button({
  children,
  variant = "default",
  icon,
  className = "",
  ...rest
}) {
  const variantClass =
    variant === "alt" ? "btn alt" : variant === "fl" ? "btn fl" : "btn";

  return (
    <button className={`${variantClass} ${className}`} {...rest}>
      {icon && <Icon name={icon} />}
      {children}
    </button>
  );
}
