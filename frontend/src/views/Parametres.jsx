import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Avatar from "../components/ui/Avatar";
import { useAuthStore } from "../store/authStore";
import {
  monProfil,
  majMonProfil,
  uploadAvatar,
  uploadCouverture,
} from "../api/endpoints";

export default function Parametres() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const setProfilStore = useAuthStore((s) => s.setProfil);

  const { data: profilData, isLoading } = useQuery({
    queryKey: ["mon-profil"],
    queryFn: monProfil,
  });

  const [form, setForm] = useState({
    nom_affiche: "",
    sous_titre: "",
    bio: "",
    ville: "",
    pays: "",
    site_web: "",
    visibilite: "public",
  });

  const [succes, setSucces] = useState("");
  const [erreur, setErreur] = useState("");
  const avatarInput = useRef(null);
  const couvertureInput = useRef(null);

  useEffect(() => {
    if (profilData) {
      setForm({
        nom_affiche: profilData.nom_affiche || "",
        sous_titre: profilData.sous_titre || "",
        bio: profilData.bio || "",
        ville: profilData.ville || "",
        pays: profilData.pays || "",
        site_web: profilData.site_web || "",
        visibilite: profilData.visibilite || "public",
      });
    }
  }, [profilData]);

  function flash(msg) {
    setSucces(msg);
    setErreur("");
    setTimeout(() => setSucces(""), 3000);
  }

  const mutation = useMutation({
    mutationFn: (data) => majMonProfil(data),
    onSuccess: (data) => {
      setProfilStore(data);
      qc.invalidateQueries({ queryKey: ["mon-profil"] });
      qc.invalidateQueries({ queryKey: ["profil"] });
      qc.invalidateQueries({ queryKey: ["profils"] });
      flash("Profil mis à jour ✅");
    },
    onError: (err) => {
      const detail = err.response?.data?.details || err.response?.data;
      setErreur(
        typeof detail === "object"
          ? Object.entries(detail)
              .map(([k, v]) => `${k}: ${[].concat(v).join(", ")}`)
              .join(" | ")
          : "Erreur lors de la sauvegarde."
      );
    },
  });

  const avatarMutation = useMutation({
    mutationFn: uploadAvatar,
    onSuccess: (data) => {
      setProfilStore(data);
      qc.invalidateQueries({ queryKey: ["mon-profil"] });
      qc.invalidateQueries({ queryKey: ["profil"] });
      flash("Avatar mis à jour ✅");
    },
    onError: (e) =>
      setErreur("Erreur avatar : " + (e.response?.data?.detail || e.message)),
  });

  const couvertureMutation = useMutation({
    mutationFn: uploadCouverture,
    onSuccess: (data) => {
      setProfilStore(data);
      qc.invalidateQueries({ queryKey: ["mon-profil"] });
      qc.invalidateQueries({ queryKey: ["profil"] });
      flash("Couverture mise à jour ✅");
    },
    onError: (e) =>
      setErreur("Erreur couverture : " + (e.response?.data?.detail || e.message)),
  });

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  function onSubmit(e) {
    e.preventDefault();
    mutation.mutate(form);
  }

  if (isLoading) return <p className="sub">Chargement…</p>;

  return (
    <>
      <button className="back" onClick={() => navigate(-1)}>
        ← Retour
      </button>

      <h1 className="vh">Modifier mon profil</h1>
      <p className="sub vs">
        Ces informations seront visibles par les autres membres d'Emmaüs.
      </p>

      <form onSubmit={onSubmit} className="card" style={{ padding: 24 }}>
        {/* AVATAR */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginBottom: 24,
            paddingBottom: 24,
            borderBottom: "1px solid var(--line)",
          }}
        >
          <Avatar profil={profilData} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              Photo de profil
            </div>
            <div className="sub" style={{ fontSize: 13, marginBottom: 8 }}>
              JPG/PNG, max 5 Mo
            </div>
            <input
              ref={avatarInput}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) avatarMutation.mutate(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              className="btn alt"
              onClick={() => avatarInput.current?.click()}
              disabled={avatarMutation.isPending}
            >
              {avatarMutation.isPending ? "Envoi…" : "Changer l'avatar"}
            </button>
          </div>
        </div>

        {/* COUVERTURE */}
        <div
          style={{
            marginBottom: 24,
            paddingBottom: 24,
            borderBottom: "1px solid var(--line)",
          }}
        >
          {profilData?.couverture && (
            <div
              style={{
                height: 120,
                borderRadius: 14,
                background: `url(${profilData.couverture}) center/cover`,
                marginBottom: 12,
              }}
            />
          )}
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Couverture</div>
          <div className="sub" style={{ fontSize: 13, marginBottom: 8 }}>
            JPG/PNG, max 10 Mo
          </div>
          <input
            ref={couvertureInput}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) couvertureMutation.mutate(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            className="btn alt"
            onClick={() => couvertureInput.current?.click()}
            disabled={couvertureMutation.isPending}
          >
            {couvertureMutation.isPending ? "Envoi…" : "Changer la couverture"}
          </button>
        </div>

        {/* CHAMPS TEXTE */}
        <div className="form-grid">
          <label className="form-field">
            <span>Nom affiché *</span>
            <input
              type="text"
              value={form.nom_affiche}
              onChange={set("nom_affiche")}
              required
              maxLength={100}
            />
          </label>

          <label className="form-field">
            <span>Sous-titre</span>
            <input
              type="text"
              value={form.sous_titre}
              onChange={set("sous_titre")}
              maxLength={150}
              placeholder="Ex : Pasteur · Église Source de Vie"
            />
          </label>

          <label className="form-field full">
            <span>Bio</span>
            <textarea
              value={form.bio}
              onChange={set("bio")}
              rows={4}
              maxLength={500}
            />
          </label>

          <label className="form-field">
            <span>Ville</span>
            <input type="text" value={form.ville} onChange={set("ville")} />
          </label>

          <label className="form-field">
            <span>Pays</span>
            <input type="text" value={form.pays} onChange={set("pays")} />
          </label>

          <label className="form-field">
            <span>Site web</span>
            <input
              type="url"
              value={form.site_web}
              onChange={set("site_web")}
              placeholder="https://…"
            />
          </label>

          <label className="form-field">
            <span>Visibilité</span>
            <select value={form.visibilite} onChange={set("visibilite")}>
              <option value="public">Public — tout le monde</option>
              <option value="abonnes">Abonnés uniquement</option>
              <option value="prive">Privé — moi seul</option>
            </select>
          </label>
        </div>

        {erreur && (
          <p
            style={{
              color: "var(--live)",
              background: "var(--brandsoft)",
              padding: "12px 16px",
              borderRadius: 12,
              marginTop: 20,
              fontSize: 14,
            }}
          >
            {erreur}
          </p>
        )}

        {succes && (
          <p
            style={{
              color: "#2e7d32",
              background: "#e8f5e9",
              padding: "12px 16px",
              borderRadius: 12,
              marginTop: 20,
              fontSize: 14,
            }}
          >
            {succes}
          </p>
        )}

        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            marginTop: 24,
          }}
        >
          <button type="button" className="btn alt" onClick={() => navigate(-1)}>
            Annuler
          </button>
          <button type="submit" className="btn" disabled={mutation.isPending}>
            {mutation.isPending ? "Sauvegarde…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </>
  );
}
