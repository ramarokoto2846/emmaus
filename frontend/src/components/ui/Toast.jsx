import { createContext, useContext, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { FiCheckCircle, FiX, FiInfo } from "react-icons/fi";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const afficher = useCallback((message, options = {}) => {
    const {
      type = "success",
      duree = 4000,
      titre = null,
    } = options;

    setToast({ message, type, titre, id: Date.now() });

    if (duree > 0) {
      setTimeout(() => {
        setToast((t) => (t && t.message === message ? null : t));
      }, duree);
    }
  }, []);

  const fermer = useCallback(() => setToast(null), []);

  return (
    <ToastContext.Provider value={{ afficher, fermer }}>
      {children}
      {toast &&
        createPortal(
          <div className="toast-container">
            <div className={`toast toast-${toast.type}`}>
              <div className="toast-icon">
                {toast.type === "success" && <FiCheckCircle size={22} />}
                {toast.type === "info" && <FiInfo size={22} />}
                {toast.type === "error" && <FiX size={22} />}
              </div>
              <div className="toast-content">
                {toast.titre && <b>{toast.titre}</b>}
                <p>{toast.message}</p>
              </div>
              <button
                className="toast-close"
                onClick={fermer}
                aria-label="Fermer"
              >
                <FiX size={16} />
              </button>
            </div>
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast doit être utilisé sous ToastProvider");
  return ctx;
}
