import { useAuthStore } from "../store/authStore";

/**
 * Retourne true si le profil passé appartient à l'utilisateur connecté.
 */
export function useEstMoi(profil) {
  const monProfil = useAuthStore((s) => s.profil);
  const monUser = useAuthStore((s) => s.user);
  if (!profil) return false;

  if (monProfil?.id && profil.id) return profil.id === monProfil.id;
  if (monUser?.id && profil.id) return profil.id === monUser.id;
  return false;
}

/** Version impérative, utilisable hors composant */
export function estMoi(profil) {
  const state = useAuthStore.getState();
  if (!profil) return false;
  const id = state.profil?.id || state.user?.id;
  return !!id && id === profil.id;
}
