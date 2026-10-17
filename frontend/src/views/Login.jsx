import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiMail,
  FiLock,
  FiEye,
  FiEyeOff,
  FiLogIn,
} from "react-icons/fi";
import { login as apiLogin, moi, monProfil } from "../api/endpoints";
import { useAuthStore } from "../store/authStore";
import { useToast } from "../components/ui/Toast";
import Logo from "../components/ui/Logo";

export default function Login() {
  const navigate = useNavigate();
  const { afficher: afficherToast } = useToast();

  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);
  const setProfil = useAuthStore((s) => s.setProfil);

  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [voirMotDePasse, setVoirMotDePasse] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErreur("");
    setChargement(true);

    try {
      const tokens = await apiLogin(email.trim().toLowerCase(), motDePasse);
      setTokens(tokens.access, tokens.refresh);

      const [u, p] = await Promise.all([moi(), monProfil()]);
      setUser(u);
      setProfil(p);

      afficherToast("Bienvenue sur Emmaüs !", {
        type: "success",
        titre: "Connexion réussie",
      });

      navigate("/");
    } catch (err) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;

      if (status === 401) {
        if (detail && detail.includes("No active account")) {
          setErreur(
            "Votre compte n'est pas encore activé. Vérifiez votre email avec le code reçu."
          );
        } else {
          setErreur("Email ou mot de passe incorrect.");
        }
      } else if (detail) {
        setErreur(Array.isArray(detail) ? detail.join(" ") : detail);
      } else {
        setErreur("Erreur de connexion. Vérifiez votre connexion internet.");
      }
    } finally {
      setChargement(false);
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
        {/* ✅ Logo conservé */}
        <Logo size={64} />

        <div className="auth-form-body">
          <h2 className="auth-title">Connexion</h2>
          <p className="auth-sub">Content de vous revoir !</p>

          {erreur && <div className="auth-erreur">{erreur}</div>}

          <label className="auth-field">
            <span>Email</span>
            <div className="auth-input-wrap">
              <FiMail className="auth-input-icon" size={18} />
              <input
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </div>
          </label>

          <label className="auth-field">
            <span>Mot de passe</span>
            <div className="auth-input-wrap">
              <FiLock className="auth-input-icon" size={18} />
              <input
                type={voirMotDePasse ? "text" : "password"}
                placeholder="••••••••"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="auth-toggle"
                onClick={() => setVoirMotDePasse((v) => !v)}
                aria-label={
                  voirMotDePasse
                    ? "Cacher le mot de passe"
                    : "Voir le mot de passe"
                }
              >
                {voirMotDePasse ? (
                  <FiEyeOff size={18} />
                ) : (
                  <FiEye size={18} />
                )}
              </button>
            </div>
          </label>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: -4,
            }}
          >
            <Link
              to="/mot-de-passe-oublie"
              className="auth-link"
              style={{ fontSize: 13 }}
            >
              Mot de passe oublié ?
            </Link>
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={chargement}
          >
            {chargement ? (
              "Connexion…"
            ) : (
              <>
                <FiLogIn
                  size={16}
                  style={{ marginRight: 8, verticalAlign: "middle" }}
                />
                Se connecter
              </>
            )}
          </button>

          <p className="auth-footer">
            Pas encore de compte ?{" "}
            <Link to="/register" className="auth-link">
              Inscrivez-vous
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}