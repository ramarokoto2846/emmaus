import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Avatar from "../components/ui/Avatar";
import NomUtilisateur from "../components/ui/NomUtilisateur";
import { profils, suivre } from "../api/endpoints";
import { useAuthStore } from "../store/authStore";

export default function Discover() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const monProfil = useAuthStore((s) => s.profil);
  const [searchParams] = useSearchParams();

  // ✅ Initialise depuis le query param ?q=
  const qInitial = searchParams.get("q") || "";
  const [recherche, setRecherche] = useState(qInitial);

  // ✅ Synchronise si l'URL change (ex: clic TopBar)
  useEffect(() => {
    const q = searchParams.get("q") || "";
    setRecherche(q);
  }, [searchParams]);

  const { data, isLoading } = useQuery({
    queryKey: ["profils", recherche],
    queryFn: () =>
      profils({
        search: recherche || undefined,
      }),
  });

  const suivreMutation = useMutation({
    mutationFn: (id) => suivre(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profils"] });
    },
  });

  const liste = data?.results || data || [];

  async function partager(p, e) {
    e.stopPropagation();
    const url = `${window.location.origin}/profil/${p.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${p.nom_affiche} sur Emmaüs`, url });
      } catch {
        /* annulé */
      }
    } else {
      await navigator.clipboard.writeText(url);
      alert("Lien du profil copié !");
    }
  }

  return (
    <>
      <h2 className="vh">Découvrir</h2>
      <p className="sub vs">
        Pasteurs, églises, chanteurs et témoins : trouve des voix à suivre.
      </p>

      {/* Barre de recherche */}
      <input
        type="text"
        placeholder="Rechercher par nom, ville, sous-titre…"
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        style={{
          width: "100%",
          padding: "12px 18px",
          borderRadius: 99,
          border: "1px solid var(--line)",
          background: "var(--surf)",
          color: "var(--ink)",
          marginBottom: 16,
        }}
      />

      {/* ✅ Les chips (Tous / Pasteurs / Églises) sont SUPPRIMÉES */}

      {isLoading ? (
        <p className="sub">Chargement…</p>
      ) : liste.length === 0 ? (
        <p className="sub">
          Aucun profil trouvé. Essaie un autre nom ou un autre thème.
        </p>
      ) : (
        <div className="pg">
          {liste.map((p) => {
            const estMoi = monProfil && p.id === monProfil.id;
            const pending =
              suivreMutation.isPending && suivreMutation.variables === p.id;

            return (
              <div
                key={p.id}
                className="card pc"
                tabIndex={0}
                onClick={() => navigate(`/profil/${p.id}`)}
              >
                {/* ✅ Photo de couverture (ou dégradé par défaut) */}
                <div
                  className="cv2"
                  style={{
                    background:
                      p.couverture || p.couverture_url
                        ? `url(${p.couverture || p.couverture_url}) center/cover`
                        : "linear-gradient(135deg, #6B1626, #A8323F 55%, #E3B94F)",
                  }}
                />
                <Avatar profil={p} />
                <NomUtilisateur profil={p} taille="sm" />
                <small>{p.sous_titre || p.ville || "Membre Emmaüs"}</small>
                <small>{p.nb_abonnes} abonnés</small>

                {estMoi ? (
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      justifyContent: "center",
                      marginTop: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      className="btn alt"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate("/parametres");
                      }}
                    >
                      Modifier mon profil
                    </button>
                    <button
                      className="btn fl"
                      onClick={(e) => partager(p, e)}
                    >
                      Partager
                    </button>
                  </div>
                ) : (
                  <button
                    className={`btn ${p.est_suivi ? "alt" : ""}`}
                    disabled={pending}
                    onClick={(e) => {
                      e.stopPropagation();
                      suivreMutation.mutate(p.id);
                    }}
                  >
                    {pending ? "…" : p.est_suivi ? "Abonné" : "Suivre"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}