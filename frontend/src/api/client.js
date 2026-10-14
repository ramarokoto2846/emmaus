import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "/api";

export const api = axios.create({
  baseURL: BASE,
});

// --- Intercepteur requête : ajoute le Bearer token
api.interceptors.request.use((config) => {
  const access = localStorage.getItem("access");
  if (access) config.headers.Authorization = `Bearer ${access}`;
  return config;
});

// --- Intercepteur réponse : refresh automatique sur 401
let refreshing = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (
      error.response?.status === 401 &&
      !original._retry &&
      localStorage.getItem("refresh")
    ) {
      original._retry = true;

      if (!refreshing) {
        refreshing = axios
          .post(`${BASE}/auth/refresh/`, {
            refresh: localStorage.getItem("refresh"),
          })
          .then((r) => {
            localStorage.setItem("access", r.data.access);
            if (r.data.refresh) localStorage.setItem("refresh", r.data.refresh);
            refreshing = null;
          })
          .catch(() => {
            refreshing = null;
            localStorage.removeItem("access");
            localStorage.removeItem("refresh");
            window.location.href = "/login";
            return Promise.reject(error);
          });
      }

      await refreshing;
      return api(original);
    }

    return Promise.reject(error);
  }
);

export default api;
