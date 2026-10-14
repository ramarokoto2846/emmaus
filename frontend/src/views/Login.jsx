import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";
import { login as apiLogin, moi, monProfil } from "../api/endpoints";
import { useAuthStore } from "../store/authStore";
import Logo from "../components/ui/Logo";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [afficheMdp, setAfficheMdp] = useState(false);
  const [erreur, setErreur] = useState("");
  const [loading, setLoading] = useState(false);

  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);
  const setProfil = useAuthStore((s) => s.setProfil);
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setErreur("");
    setLoading(true);
    try {
      const data = await apiLogin(email, password);
      setTokens(data.access, data.refresh);
      const [u, p] = await Promise.all([moi(), monProfil()]);
      setUser(u);
      setProfil(p);
      navigate("/");
    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data?.details;
      setErreur(
        typeof detail === "string"
          ? detail
          : "Identifiants invalides. Vérifie ton email et mot de passe."
      );
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
        <Logo size={72} />

        <div className="auth-form-body">
          <h2 className="auth-title">Bon retour parmi nous</h2>
          <p className="auth-sub">Connecte-toi pour retrouver ta communauté</p>

          <label className="auth-field">
            <span>Email</span>
            <div className="auth-input-wrap">
              <FiMail size={18} className="auth-input-icon" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ton@email.com"
                required
                autoFocus
              />
            </div>
          </label>

          <label className="auth-field">
            <span>Mot de passe</span>
            <div className="auth-input-wrap">
              <FiLock size={18} className="auth-input-icon" />
              <input
                type={afficheMdp ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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
            {loading ? "Connexion…" : "Se connecter"}
          </button>

          <p className="auth-footer">
            Pas encore de compte ?{" "}
            <Link to="/register" className="auth-link">
              Créer un compte
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
