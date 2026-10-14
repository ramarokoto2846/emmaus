import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";

export function formatRelative(dateStr) {
  if (!dateStr) return "";
  try {
    return formatDistanceToNow(new Date(dateStr), {
      addSuffix: true,
      locale: fr,
    });
  } catch {
    return "";
  }
}

export function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    return format(new Date(dateStr), "d MMM yyyy", { locale: fr });
  } catch {
    return "";
  }
}

export function formatDuration(seconds) {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function initiales(nom) {
  if (!nom) return "?";
  return nom
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
