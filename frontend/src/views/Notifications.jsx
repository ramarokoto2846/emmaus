import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Avatar from "../components/ui/Avatar";
import Button from "../components/ui/Button";
import {
  notifications,
  lireNotification,
  toutLireNotifications,
} from "../api/endpoints";
import { formatRelative } from "../utils/format";

const LIBELLES = {
  amen: "a mis un Amen à votre publication",
  commentaire: "a commenté votre publication",
  abonne: "s'est abonné à votre profil",
  direct: "a lancé un direct",
  priere: "a prié pour votre sujet",
  defi: "vous invite à un défi",
  message: "vous a envoyé un message",
  message_supprime: "a supprimé un message dans votre conversation",
  signalement:
    "Votre contenu a été signalé et est en cours d'examen.",
  signalement_leve:
    "Bonne nouvelle : votre contenu a été rétabli après examen.",
  signalement_confirme:
    "Votre contenu a été définitivement suspendu après examen.",
  verset: "a partagé le verset du jour",
};

export default function Notifications() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications-list"],
    queryFn: () => notifications(),
    refetchInterval: 30_000,
  });

  const lireMutation = useMutation({
    mutationFn: (id) => lireNotification(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications-list"] });
      qc.invalidateQueries({ queryKey: ["notifications-count"] });
    },
  });

  const toutLireMutation = useMutation({
    mutationFn: toutLireNotifications,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications-list"] });
      qc.invalidateQueries({ queryKey: ["notifications-count"] });
    },
  });

  const liste = data?.results || data || [];
  const nonLues = liste.filter((n) => !n.lu).length;

  function handleClick(n) {
    if (!n.lu) lireMutation.mutate(n.id);

    if (n.cible_type === "publication") navigate("/");
    else if (n.cible_type === "profil") navigate(`/profil/${n.cible_id}`);
    else if (n.cible_type === "message") navigate("/messages");
    else if (n.cible_type === "direct") navigate(`/direct/${n.cible_id}`);
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <h1 className="vh">Notifications</h1>
        {nonLues > 0 && (
          <Button
            variant="alt"
            onClick={() => toutLireMutation.mutate()}
            disabled={toutLireMutation.isPending}
          >
            {toutLireMutation.isPending
              ? "…"
              : `Tout marquer comme lu (${nonLues})`}
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="sub">Chargement…</p>
      ) : liste.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <p className="sub">Aucune notification pour l'instant.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 8 }}>
          {liste.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              style={{
                display: "flex",
                gap: 14,
                alignItems: "center",
                padding: "14px 16px",
                borderRadius: 14,
                width: "100%",
                textAlign: "left",
                background: n.lu ? "transparent" : "var(--brandsoft)",
                marginBottom: 4,
                transition: "background 0.15s",
              }}
            >
              <Avatar profil={n.acteur} size="sm" />
              <div style={{ flex: 1, lineHeight: 1.4, minWidth: 0 }}>
                <b>{n.acteur?.nom_affiche || "Quelqu'un"}</b>{" "}
                <span style={{ color: "var(--mute)" }}>
                  {LIBELLES[n.type] || n.type}
                </span>
                <div
                  style={{
                    fontSize: 12.5,
                    color: "var(--mute)",
                    marginTop: 2,
                  }}
                >
                  {formatRelative(n.cree_le)}
                </div>
              </div>
              {!n.lu && (
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 99,
                    background: "var(--live)",
                    flex: "none",
                  }}
                />
              )}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
