import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      profil: null,
      access: null,
      refresh: null,

      setTokens: (access, refresh) => {
        localStorage.setItem("access", access);
        if (refresh) localStorage.setItem("refresh", refresh);
        set({ access, refresh });
      },

      setUser: (user) => set({ user }),
      setProfil: (profil) => set({ profil }),

      deconnexion: () => {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        set({ user: null, profil: null, access: null, refresh: null });
      },

      estConnecte: () => !!get().access,
    }),
    {
      name: "emmaus-auth",
      partialize: (state) => ({
        access: state.access,
        refresh: state.refresh,
        user: state.user,
        profil: state.profil,
      }),
    }
  )
);
