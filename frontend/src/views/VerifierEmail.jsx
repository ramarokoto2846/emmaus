import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { FiKey, FiCheckCircle, FiArrowLeft } from "react-icons/fi";
import { verifierEmail, renvoyerCodeVerification } from "../api/endpoints";
import { useToast } from "../components/ui/Toast";

export default function VerifierEmail() {
  const navigate = useNavigate();
  const { afficher: afficherToast } = useToast();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";

  const [code, setCode] = useState("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState(false);

  async function validerCode(e) {
    e.preventDefault();
    setErreur("");
    setChargement(true);
    try {
      await verifierEmail(email, code);
      setSucces(true);
      afficherToast("Email vérifié ! Vous pouvez vous connecter.", {
        type: "success",
        titre: "Compte activé",
      });
    } catch (err) {
      setErreur(err?.response?.data?.detail || "Code invalide.");
    } finally {
      setChargement(false);
    }
  }

  async function renvoyer() {
    setErreur("");
    try {
      await renvoyerCodeVerification(email);
      afficherToast("Nouveau code envoyé.", {
        type: "success",
        titre: "Vérifiez votre email",
      });
    } catch (err) {
      setErreur(err?.response?.data?.detail || "Erreur d'envoi.");
    }
  }

  if (!email) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <p className="auth-erreur">Aucun email fourni.</p>
          <Link to="/register" className="auth-link">
            Retour à l'inscription
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-bg-blob auth-bg-blob-1" />
        <div className="auth-bg-blob auth-bg-blob-2" />
        <div className="auth-bg-blob auth-bg-blob-3" />
      </div>

      <div className="auth-card">
        <button
          className="back"
          onClick={() => navigate("/login")}
          type="button"
        >
          <FiArrowLeft size={16} style={{ marginRight: 6 }} />
          Retour à la connexion
        </button>

        {!succes ? (
          <>
            <div className="logo-auth">
              <h1>Vérifiez votre email</h1>
              <p className="logo-tagline">
                Un code à 6 chiffres a été envoyé à <b>{email}</b>
              </p>
            </div>

            <form onSubmit={validerCode} className="auth-form-body">
              {erreur && <div className="auth-erreur">{erreur}</div>}

              <label className="auth-field">
                <span>Code de vérification</span>
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

              <button
                type="submit"
                className="auth-submit"
                disabled={chargement || code.length !== 6}
              >
                {chargement ? "Vérification…" : "Activer mon compte"}
              </button>

              <p className="auth-footer">
                Vous n'avez rien reçu ?{" "}
                <button
                  type="button"
                  onClick={renvoyer}
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
        ) : (
          <div className="auth-form-body" style={{ textAlign: "center" }}>
            <FiCheckCircle
              size={64}
              style={{ color: "#2e7d32", margin: "20px auto" }}
            />
            <h2 className="auth-title">Compte activé !</h2>
            <p className="auth-sub">
              Vous pouvez maintenant vous connecter à Emmaüs.
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