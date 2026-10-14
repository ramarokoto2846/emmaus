import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FiMail, FiLock, FiUser, FiEye, FiEyeOff } from "react-icons/fi";
import { inscription, login } from "../api/endpoints";
import { useAuthStore } from "../store/authStore";
import Logo from "../components/ui/Logo";

export default function Register() {
  const [form, setForm] = useState({
    email: "",
    pseudo: "",
    mot_de_passe: "",
    nom_affiche: "",
  });
  const [afficheMdp, setAfficheMdp] = useState(false);
  const [erreur, setErreur] = useState("");
  const [loading, setLoading] = useState(false);

  const setTokens = useAuthStore((s) => s.setTokens);
  const navigate = useNavigate();

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    setErreur("");
    setLoading(true);
    try {
      await inscription(form);
      const data = await login(form.email, form.mot_de_passe);
      setTokens(data.access, data.refresh);
      navigate("/");
    } catch (err) {
      const detail = err.response?.data?.details || err.response?.data;
      let msg = "Erreur lors de l'inscription.";
      if (typeof detail === "object") {
        msg = Object.entries(detail)
          .map(([k, v]) => `${k}: ${[].concat(v).join(", ")}`)
          .join(" · ");
      } else if (typeof detail === "string") {
        msg = detail;
      }
      setErreur(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-bg" aria-hidden="true">
        <div className="auth-bg-blob auth-bg-blob-1" />
        <div className="auth-bg-blob auth-bg-blob-2" />
        <div className="auth-bg-blob auth-bg-blob-3" />
      </div>

      <form onSubmit={onSubmit} className="auth-card">
        <Logo size={64} />

        <div className="auth-form-body">
          <h2 className="auth-title">Rejoins Emmaüs</h2>
          <p className="auth-sub">
            Crée ton compte et partage la Parole avec ta communauté
          </p>

          <label className="auth-field">
            <span>Email *</span>
            <div className="auth-input-wrap">
              <FiMail size={18} className="auth-input-icon" />
              <input
                type="email"
                value={form.email}
                onChange={set("email")}
                placeholder="ton@email.com"
                required
              />
            </div>
          </label>

          <label className="auth-field">
            <span>Pseudo *</span>
            <div className="auth-input-wrap">
              <FiUser size={18} className="auth-input-icon" />
              <input
                type="text"
                value={form.pseudo}
                onChange={set("pseudo")}
                placeholder="tonpseudo"
                minLength={3}
                required
              />
            </div>
          </label>

          <label className="auth-field">
            <span>Nom affiché</span>
            <div className="auth-input-wrap">
              <FiUser size={18} className="auth-input-icon" />
              <input
                type="text"
                value={form.nom_affiche}
                onChange={set("nom_affiche")}
                placeholder="Ton nom public (optionnel)"
              />
            </div>
          </label>

          <label className="auth-field">
            <span>Mot de passe *</span>
            <div className="auth-input-wrap">
              <FiLock size={18} className="auth-input-icon" />
              <input
                type={afficheMdp ? "text" : "password"}
                value={form.mot_de_passe}
                onChange={set("mot_de_passe")}
                placeholder="8 caractères minimum"
                minLength={8}
                required
              />
              <button
                type="button"
                className="auth-toggle"
                onClick={() => setAfficheMdp((v) => !v)}
                aria-label={afficheMdp ? "Masquer" : "Afficher"}
              >
                {afficheMdp ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
          </label>

          {erreur && <div className="auth-erreur">{erreur}</div>}

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading ? "Création…" : "Créer mon compte"}
          </button>

          <p className="auth-footer">
            Déjà membre ?{" "}
            <Link to="/login" className="auth-link">
              Se connecter
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
