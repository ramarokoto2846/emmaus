import api from "./client";

// ============================================
// AUTH
// ============================================
export const inscription = (data) => api.post("/auth/inscription/", data).then((r) => r.data);
export const login = (email, password) =>
  api.post("/auth/login/", { email, password }).then((r) => r.data);
export const logout = (refresh) => api.post("/auth/logout/", { refresh }).then((r) => r.data);
export const moi = () => api.get("/auth/moi/").then((r) => r.data);
export const monProfil = () => api.get("/auth/mon-profil/").then((r) => r.data);
export const majMonProfil = (data) =>
  api.patch("/auth/mon-profil/", data).then((r) => r.data);
export const mesAbonnements = () => api.get("/auth/mes-abonnements/").then((r) => r.data);

// ============================================
// UPLOAD
// ============================================
export const uploadAvatar = (fichier) => {
  const fd = new FormData();
  fd.append("avatar", fichier);
  return api
    .post("/auth/mon-profil/avatar/", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

export const uploadCouverture = (fichier) => {
  const fd = new FormData();
  fd.append("couverture", fichier);
  return api
    .post("/auth/mon-profil/couverture/", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

// ============================================
// PROFILS & ÉGLISES
// ============================================
export const profils = (params) => api.get("/profils/", { params }).then((r) => r.data);
export const profil = (id) => api.get(`/profils/${id}/`).then((r) => r.data);
export const suivre = (id) => api.post(`/profils/${id}/suivre/`).then((r) => r.data);
export const desuivre = (id) => api.post(`/profils/${id}/desuivre/`).then((r) => r.data);
export const eglises = (params) => api.get("/eglises/", { params }).then((r) => r.data);

// ============================================
// FIL & PUBLICATIONS
// ============================================
export const fil = (params) => api.get("/fil/", { params }).then((r) => r.data);
export const publications = (params) => api.get("/publications/", { params }).then((r) => r.data);
export const publication = (id) => api.get(`/publications/${id}/`).then((r) => r.data);
export const creerPublication = (data) => api.post("/publications/", data).then((r) => r.data);
export const amenPublication = (id) => api.post(`/publications/${id}/amen/`).then((r) => r.data);

// ============================================
// COMMENTAIRES
// ============================================

// ============================================
// VIDÉOS
// ============================================
export const videos = (params) => api.get("/videos/", { params }).then((r) => r.data);
export const video = (id) => api.get(`/videos/${id}/`).then((r) => r.data);
export const creerVideo = (data) => api.post("/videos/", data).then((r) => r.data);
export const publierVideo = (id) => api.post(`/videos/${id}/publier/`).then((r) => r.data);
export const enregistrerVue = (id, data) => api.post(`/videos/${id}/vue/`, data).then((r) => r.data);

// ============================================
// THÈMES & VERSETS
// ============================================
export const themes = () => api.get("/themes/").then((r) => r.data);
export const versets = (params) => api.get("/versets/", { params }).then((r) => r.data);

// ============================================
// DIRECTS
// ============================================
export const directs = (params) => api.get("/directs/", { params }).then((r) => r.data);
export const direct = (id) => api.get(`/directs/${id}/`).then((r) => r.data);
export const directsLive = () => api.get("/directs/live/").then((r) => r.data);
export const messagesDirect = (id) => api.get(`/directs/${id}/messages/`).then((r) => r.data);
export const envoyerMessageDirect = (id, texte) =>
  api.post(`/directs/${id}/messages/`, { texte }).then((r) => r.data);

// ============================================
// MESSAGERIE
// ============================================
export const conversations = () => api.get("/conversations/").then((r) => r.data);
export const conversation = (id) => api.get(`/conversations/${id}/`).then((r) => r.data);
export const conversationMessages = (id) =>
  api.get(`/conversations/${id}/messages/`).then((r) => r.data);
export const envoyerMessage = (id, texte) =>
  api.post(`/conversations/${id}/messages/`, { texte }).then((r) => r.data);
export const demarrerConversation = (utilisateurId) =>
  api.post("/conversations/demarrer/", { utilisateur_id: utilisateurId }).then((r) => r.data);

// ============================================
// NOTIFICATIONS
// ============================================
export const notifications = (params) => api.get("/notifications/", { params }).then((r) => r.data);
export const compterNotifications = () => api.get("/notifications/compter/").then((r) => r.data);
export const lireNotification = (id) => api.post(`/notifications/${id}/lire/`).then((r) => r.data);
export const toutLireNotifications = () => api.post("/notifications/tout_lire/").then((r) => r.data);

// ============================================
// PRIÈRE & DÉFIS
// ============================================
export const sujetsPriere = (params) => api.get("/sujets-priere/", { params }).then((r) => r.data);
export const creerSujetPriere = (data) => api.post("/sujets-priere/", data).then((r) => r.data);
export const prier = (id) => api.post(`/sujets-priere/${id}/prier/`).then((r) => r.data);
export const defisLecture = () => api.get("/defis-lecture/").then((r) => r.data);
export const rejoindreDefi = (id) => api.post(`/defis-lecture/${id}/rejoindre/`).then((r) => r.data);

// ============================================
// RECHERCHE
// ============================================
export const recherche = (q) => api.get("/recherche/", { params: { q } }).then((r) => r.data);

// --- Abonnés / abonnements
export const mesAbonnes = () => api.get("/auth/mes-abonnes/").then((r) => r.data);
export const abonnesDe = (userId) =>
  api.get(`/profils/${userId}/abonnes/`).then((r) => r.data);
export const abonnementsDe = (userId) =>
  api.get(`/profils/${userId}/abonnements/`).then((r) => r.data);

// --- Modifier / supprimer une publication
export const majPublication = (id, data) =>
  api.patch(`/publications/${id}/`, data).then((r) => r.data);
export const supprimerPublication = (id) =>
  api.delete(`/publications/${id}/`).then((r) => r.data);

// --- Supprimer un message
export const supprimerMessage = (id) =>
  api.delete(`/messages/${id}/supprimer/`).then((r) => r.data);

// --- Signalements
export const signaler = (data) =>
  api.post("/signalements/", data).then((r) => r.data);

// --- Modération
export const moderationSignalements = () =>
  api.get("/moderation/signalements_ouverts/").then((r) => r.data);
export const moderationRemettre = (signalementId) =>
  api.post("/moderation/remettre/", { signalement_id: signalementId }).then((r) => r.data);
export const moderationSupprimerDefinitif = (signalementId) =>
  api.post("/moderation/supprimer_definitif/", { signalement_id: signalementId }).then((r) => r.data);
export const moderationConfirmer = (signalementId) =>
  api.post("/moderation/confirmer/", { signalement_id: signalementId }).then((r) => r.data);

// --- Versets pour la sidebar (carrousel)
export const versetsSidebar = () =>
  api.get("/versets-sidebar/").then((r) => r.data);
export const toggleVersetSidebar = (id) =>
  api.post(`/versets/${id}/toggle_sidebar/`).then((r) => r.data);

// --- Versets : création admin
export const creerVerset = (data) =>
  api.post("/versets/", data).then((r) => r.data);
export const majVerset = (id, data) =>
  api.patch(`/versets/${id}/`, data).then((r) => r.data);
export const supprimerVerset = (id) =>
  api.delete(`/versets/${id}/`).then((r) => r.data);

// Verset du jour (simple)
export const versetDuJour = () =>
  api.get("/verset-du-jour/").then((r) => r.data);

// --- Commentaires
export const commentaires = (params) =>
  api.get("/commentaires/", { params }).then((r) => r.data);
export const creerCommentaire = (data) =>
  api.post("/commentaires/", data).then((r) => r.data);
export const majCommentaire = (id, data) =>
  api.patch(`/commentaires/${id}/`, data).then((r) => r.data);
export const supprimerCommentaire = (id) =>
  api.delete(`/commentaires/${id}/`).then((r) => r.data);

// --- Upload vidéo avec compression
export const uploadVideo = (formData, onProgress) => {
  return api
    .post("/videos-upload/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      },
      timeout: 600000,
    })
    .then((r) => r.data);
};

// --- Modération : compteur
export const compterSignalements = () =>
  api.get("/moderation/compter/").then((r) => r.data);

// --- Notifications : suppression
export const supprimerNotification = (id) =>
  api.delete(`/notifications/${id}/`).then((r) => r.data);
export const toutSupprimerNotifications = () =>
  api.post("/notifications/tout_supprimer/").then((r) => r.data);

// --- Modération : gestion des modérateurs (admin)
export const promouvoirModerateur = (userId) =>
  api.post(`/profils/${userId}/promouvoir_moderateur/`).then((r) => r.data);
export const retrograderModerateur = (userId) =>
  api.post(`/profils/${userId}/retrograder_moderateur/`).then((r) => r.data);
export const listeModerateurs = () =>
  api.get("/profils/moderateurs/").then((r) => r.data);

// --- Enregistrements
export const enregistrerContenu = (data) =>
  api.post("/enregistrements/", data).then((r) => r.data);
export const compterEnregistrements = () =>
  api.get("/enregistrements/compter/").then((r) => r.data);
export const verifierEnregistrement = (cibleType, cibleId) =>
  api
    .get("/enregistrements/verifier/", {
      params: { cible_type: cibleType, cible_id: cibleId },
    })
    .then((r) => r.data);
export const listeEnregistrements = () =>
  api.get("/enregistrements/liste/").then((r) => r.data);

// --- Repartage
export const repartager = (id, texte = "") =>
  api.post(`/publications/${id}/repartager/`, { texte }).then((r) => r.data);

export const verifierRepartage = (id) =>
  api.get(`/publications/${id}/verifier_repartage/`).then((r) => r.data);


/* ============================================================
   Commentaires
   ============================================================ */
export const commentaire = (id) =>
  api.get(`/commentaires/${id}/`).then((r) => r.data);