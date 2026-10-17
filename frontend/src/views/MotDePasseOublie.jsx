import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  FiMail,
  FiLock,
  FiArrowLeft,
  FiCheckCircle,
  FiKey,
  FiEye,
  FiEyeOff,
} from "react-icons/fi";
import {
  demanderReinitialisation,
  reinitialiserMotDePasse,
} from "../api/endpoints";
import { useToast } from "../components/ui/Toast";
import Logo from "../components/ui/Logo";

export default function MotDePasseOublie() {
  const navigate = useNavigate();
  const { afficher: afficherToast } = useToast();

  const [etape, setEtape] = useState("email"); // "email" | "code" | "succes"
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [nouveauMdp, setNouveauMdp] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [voirNouveauMdp, setVoirNouveauMdp] = useState(false);
  const [voirConfirmation, setVoirConfirmation] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");

  async function envoyerCode(e) {
    e.preventDefault();
    setErreur("");
    setChargement(true);
    try {
      await demanderReinitialisation(email.trim().toLowerCase());
      setEtape("code");
      afficherToast("Code envoyé par email.", {
        type: "success",
        titre: "Vérifiez votre boîte mail",
      });
    } catch (err) {
      setErreur(
        err?.response?.data?.detail || "Erreur lors de l'envoi du code."
      );
    } finally {
      setChargement(false);
    }
  }

  async function validerCode(e) {
    e.preventDefault();
    setErreur("");

    if (nouveauMdp !== confirmation) {
      setErreur("Les mots de passe ne correspondent pas.");
      return;
    }

    if (nouveauMdp.length < 8) {
      setErreur("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    setChargement(true);
    try {
      await reinitialiserMotDePasse(
        email.trim().toLowerCase(),
        code.trim(),
        nouveauMdp
      );
      setEtape("succes");
      afficherToast("Mot de passe réinitialisé.", {
        type: "success",
        titre: "Succès",
      });
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setErreur(
        Array.isArray(detail) ? detail.join(" ") : detail || "Code invalide."
      );
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

      <div className="auth-card">
        {/* ✅ Logo */}
        <Logo size={64} />

        <button
          className="back"
          onClick={() => navigate("/login")}
          type="button"
        >
          <FiArrowLeft size={16} style={{ marginRight: 6 }} />
          Retour à la connexion
        </button>

        {/* ============================================================
            ÉTAPE 1 : Email
           ============================================================ */}
        {etape === "email" && (
          <>
            <div className="logo-auth">
              <h1>Mot de passe oublié</h1>
              <p className="logo-tagline">
                Saisissez votre email pour recevoir un code
              </p>
            </div>

            <form onSubmit={envoyerCode} className="auth-form-body">
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
                    autoFocus
                    autoComplete="email"
                  />
                </div>
              </label>

              <button
                type="submit"
                className="auth-submit"
                disabled={chargement}
              >
                {chargement ? "Envoi…" : "Envoyer le code"}
              </button>

              <p className="auth-footer">
                <Link to="/login" className="auth-link">
                  Retour à la connexion
                </Link>
              </p>
            </form>
          </>
        )}

        {/* ============================================================
            ÉTAPE 2 : Code + nouveau mot de passe
           ============================================================ */}
        {etape === "code" && (
          <>
            <div className="logo-auth">
              <h1>Code de vérification</h1>
              <p className="logo-tagline">
                Un code à 6 chiffres a été envoyé à <b>{email}</b>
              </p>
            </div>

            <form onSubmit={validerCode} className="auth-form-body">
              {erreur && <div className="auth-erreur">{erreur}</div>}

              <label className="auth-field">
                <span>Code (6 chiffres)</span>
                <div className="auth-input-wrap">
                  <FiKey className="auth-input-icon" size={18} />
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="123456"
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    maxLength={6}
                    required
                    autoFocus
                    style={{
                      letterSpacing: "0.4em",
                      fontSize: 20,
                      fontWeight: 700,
                      textAlign: "center",
                    }}
                  />
                </div>
              </label>

              {/* ✅ Nouveau mot de passe avec œil */}
              <label className="auth-field">
                <span>Nouveau mot de passe</span>
                <div className="auth-input-wrap">
                  <FiLock className="auth-input-icon" size={18} />
                  <input
                    type={voirNouveauMdp ? "text" : "password"}
                    placeholder="••••••••"
                    value={nouveauMdp}
                    onChange={(e) => setNouveauMdp(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="auth-toggle"
                    onClick={() => setVoirNouveauMdp((v) => !v)}
                    aria-label={
                      voirNouveauMdp
                        ? "Cacher le mot de passe"
                        : "Voir le mot de passe"
                    }
                  >
                    {voirNouveauMdp ? (
                      <FiEyeOff size={18} />
                    ) : (
                      <FiEye size={18} />
                    )}
                  </button>
                </div>
              </label>

              {/* ✅ Confirmation avec œil */}
              <label className="auth-field">
                <span>Confirmer le mot de passe</span>
                <div className="auth-input-wrap">
                  <FiLock className="auth-input-icon" size={18} />
                  <input
                    type={voirConfirmation ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="auth-toggle"
                    onClick={() => setVoirConfirmation((v) => !v)}
                    aria-label={
                      voirConfirmation
                        ? "Cacher le mot de passe"
                        : "Voir le mot de passe"
                    }
                  >
                    {voirConfirmation ? (
                      <FiEyeOff size={18} />
                    ) : (
                      <FiEye size={18} />
                    )}
                  </button>
                </div>
              </label>

              <button
                type="submit"
                className="auth-submit"
                disabled={chargement}
              >
                {chargement ? "Réinitialisation…" : "Réinitialiser"}
              </button>

              <p className="auth-footer">
                <button
                  type="button"
                  onClick={() => setEtape("email")}
                  className="auth-link"
                  style={{
                    background: "none",
                    border: 0,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Renvoyer le code
                </button>
              </p>
            </form>
          </>
        )}

        {/* ============================================================
            ÉTAPE 3 : Succès
           ============================================================ */}
        {etape === "succes" && (
          <div
            className="auth-form-body"
            style={{ textAlign: "center", paddingTop: 20 }}
          >
            <FiCheckCircle
              size={64}
              style={{ color: "#2e7d32", margin: "20px auto" }}
            />
            <h2 className="auth-title">Mot de passe réinitialisé</h2>
            <p className="auth-sub">
              Vous pouvez maintenant vous connecter avec votre nouveau mot de
              passe.
            </p>
            <button
              className="auth-submit"
              onClick={() => navigate("/login")}
            >
              Aller à la connexion
            </button>
          </div>
        )}
      </div>
    </div>
  );
}