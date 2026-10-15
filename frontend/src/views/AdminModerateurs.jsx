import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FiUserX,
  FiSearch,
  FiX,
  FiExternalLink,
  FiUserCheck,
} from "react-icons/fi";
import Avatar from "../components/ui/Avatar";
import NomUtilisateur from "../components/ui/NomUtilisateur";
import { useConfirmation } from "../components/ui/Confirmation";
import { useToast } from "../components/ui/Toast";
import {
  listeModerateurs,
  retrograderModerateur,
} from "../api/endpoints";

export default function AdminModerateurs() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const confirmer = useConfirmation();
  const { afficher: afficherToast } = useToast();
  const [recherche, setRecherche] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["moderateurs"],
    queryFn: listeModerateurs,
  });

  const retrograderMutation = useMutation({
    mutationFn: (userId) => retrograderModerateur(userId),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["moderateurs"] });
      afficherToast(
        res?.detail || "Le rôle de modérateur a été retiré.",
        {
          type: "success",
          titre: "Rôle retiré",
        }
      );
    },
    onError: (err) => {
      afficherToast(
        err?.response?.data?.detail ||
          "Impossible de retirer le rôle de modérateur.",
        { type: "error", titre: "Erreur" }
      );
    },
  });

  const moderateurs = data?.results || data || [];

  // ✅ Filtre de recherche : nom, pseudo, email
  const listeFiltree = useMemo(() => {
    if (!recherche.trim()) return moderateurs;
    const q = recherche.toLowerCase().trim();
    return moderateurs.filter((m) => {
      const nom = (m.nom_affiche || "").toLowerCase();
      const pseudo = (m.pseudo || "").toLowerCase();
      const email = (m.email || "").toLowerCase();
      const initiales = (m.initiales || "").toLowerCase();
      return (
        nom.includes(q) ||
        pseudo.includes(q) ||
        email.includes(q) ||
        initiales.includes(q)
      );
    });
  }, [moderateurs, recherche]);

  async function retirerRole(moderateur, e) {
    e.stopPropagation();

    const nom = moderateur.nom_affiche || moderateur.pseudo;
    const ok = await confirmer({
      titre: `Retirer le rôle de modérateur ?`,
      message: `${nom} redeviendra un simple membre. Cette action peut être annulée en le promouvant à nouveau.`,
      labelConfirmer: "Retirer",
      danger: true,
    });
    if (ok) retrograderMutation.mutate(moderateur.id);
  }

  return (
    <>
      <h1 className="vh">Modérateurs</h1>
      <p className="sub" style={{ marginBottom: 20 }}>
        Gère les membres qui ont le rôle de modérateur. Ils peuvent examiner
        les signalements et modérer les contenus.
      </p>

      {/* Barre de recherche */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
          }}
        >
          <FiSearch
            size={18}
            style={{
              position: "absolute",
              left: 16,
              color: "var(--mute)",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            placeholder="Rechercher par nom, pseudo, email…"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 44px 12px 46px",
              borderRadius: 12,
              border: "1px solid var(--line)",
              background: "var(--bg)",
              color: "var(--ink)",
              font: "inherit",
              outline: "none",
            }}
          />
          {recherche && (
            <button
              onClick={() => setRecherche("")}
              aria-label="Effacer la recherche"
              style={{
                position: "absolute",
                right: 12,
                width: 28,
                height: 28,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                color: "var(--mute)",
                background: "none",
                border: 0,
                cursor: "pointer",
              }}
            >
              <FiX size={16} />
            </button>
          )}
        </div>

        {recherche && (
          <p className="sub" style={{ marginTop: 8, fontSize: 13 }}>
            {listeFiltree.length} résultat
            {listeFiltree.length > 1 ? "s" : ""} sur {moderateurs.length}
          </p>
        )}
      </div>

      {/* Liste */}
      {isLoading ? (
        <p className="sub">Chargement…</p>
      ) : listeFiltree.length === 0 ? (
        <div
          className="card"
          style={{ padding: 40, textAlign: "center" }}
        >
          <FiUserCheck
            size={48}
            style={{ color: "var(--mute)", marginBottom: 12 }}
          />
          <p className="sub">
            {recherche
              ? `Aucun modérateur ne correspond à "${recherche}".`
              : "Aucun modérateur pour le moment."}
          </p>
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          {listeFiltree.map((m, index) => {
            const estDernier = index === listeFiltree.length - 1;
            const nom = m.nom_affiche || m.pseudo;
            return (
              <div
                key={m.id}
                className="moderateur-item"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 18px",
                  borderBottom: estDernier ? "none" : "1px solid var(--line)",
                }}
              >
                <Avatar profil={m} size="sm" />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <NomUtilisateur profil={m} taille="sm" />
                  <div
                    className="sub"
                    style={{
                      fontSize: 12.5,
                      marginTop: 2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {m.pseudo && `@${m.pseudo}`}
                    {m.pseudo && m.email && " · "}
                    {m.email}
                  </div>
                </div>

                {/* Actions à droite */}
                <div
                  className="moderateur-actions"
                  style={{
                    display: "flex",
                    gap: 8,
                    flex: "none",
                  }}
                >
                  {/* Bouton "Voir" */}
                  <button
                    onClick={() => navigate(`/profil/${m.id}`)}
                    className="btn alt"
                    aria-label={`Voir le profil de ${nom}`}
                    title="Voir le profil"
                    style={{
                      padding: "8px 14px",
                      fontSize: 13,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <FiExternalLink size={14} />
                    Voir
                  </button>

                  {/* Bouton "Retirer" (icône alignée) */}
                  <button
                    onClick={(e) => retirerRole(m, e)}
                    className="btn danger"
                    aria-label={`Retirer le rôle de modérateur de ${nom}`}
                    title="Retirer le rôle de modérateur"
                    disabled={retrograderMutation.isPending}
                    style={{
                      padding: "8px 10px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <FiUserX size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CSS inline pour responsive */}
      <style>{`
        @media (max-width: 480px) {
          .moderateur-item {
            flex-wrap: wrap;
          }
          .moderateur-actions {
            width: 100%;
            justify-content: flex-end;
          }
        }
      `}</style>
    </>
  );
}