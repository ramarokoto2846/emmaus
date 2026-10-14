import { createContext, useContext, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { FiAlertTriangle } from "react-icons/fi";

const ConfirmationContext = createContext(null);

export function ConfirmationProvider({ children }) {
  const [state, setState] = useState({
    ouvert: false,
    titre: "",
    message: "",
    labelConfirmer: "Confirmer",
    labelAnnuler: "Annuler",
    danger: true,
    onConfirmer: null,
    onAnnuler: null,
  });

  const confirmer = useCallback(
    ({
      titre = "Êtes-vous sûr ?",
      message = "",
      labelConfirmer = "Confirmer",
      labelAnnuler = "Annuler",
      danger = true,
    } = {}) => {
      return new Promise((resolve) => {
        setState({
          ouvert: true,
          titre,
          message,
          labelConfirmer,
          labelAnnuler,
          danger,
          onConfirmer: () => {
            setState((s) => ({ ...s, ouvert: false }));
            resolve(true);
          },
          onAnnuler: () => {
            setState((s) => ({ ...s, ouvert: false }));
            resolve(false);
          },
        });
      });
    },
    []
  );

  return (
    <ConfirmationContext.Provider value={{ confirmer }}>
      {children}
      {state.ouvert && createPortal(
        <div
          className="confirm-overlay"
          onClick={state.onAnnuler}
        >
          <div
            className="confirm-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="confirm-head">
              <div className={`confirm-icon ${state.danger ? "danger" : ""}`}>
                <FiAlertTriangle size={22} />
              </div>
              <h3>{state.titre}</h3>
            </div>
            {state.message && <p className="sub">{state.message}</p>}
            <div className="confirm-actions">
              <button
                className="btn alt"
                onClick={state.onAnnuler}
              >
                {state.labelAnnuler}
              </button>
              <button
                className={`btn ${state.danger ? "danger" : ""}`}
                onClick={state.onConfirmer}
              >
                {state.labelConfirmer}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </ConfirmationContext.Provider>
  );
}

export function useConfirmation() {
  const ctx = useContext(ConfirmationContext);
  if (!ctx) throw new Error("useConfirmation doit être utilisé sous ConfirmationProvider");
  return ctx.confirmer;
}
