import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Avatar from "../ui/Avatar";
import Icon from "../ui/Icon";
import { useAuthStore } from "../../store/authStore";
import { creerPublication } from "../../api/endpoints";

export default function Composer() {
  const profil = useAuthStore((s) => s.profil);
  const [searchParams, setSearchParams] = useSearchParams();
  const [ouvert, setOuvert] = useState(searchParams.get("composer") === "1");
  
  const [texte, setTexte] = useState("");
  const navigate = useNavigate();
  const [estMobile, setEstMobile] = useState(
    typeof window !== "undefined" && window.innerWidth <= 1100
  );
  const qc = useQueryClient();

  useEffect(() => {
    function onResize() {
      setEstMobile(window.innerWidth <= 1100);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (searchParams.get("composer") === "1") setOuvert(true);
  }, [searchParams]);

  const mutation = useMutation({
    mutationFn: () =>
      creerPublication({
        texte,
        type: "texte",
        visibilite: "public",
      }),
    onSuccess: () => {
      setTexte("");
      setOuvert(false);
      searchParams.delete("composer");
      setSearchParams(searchParams, { replace: true });
      qc.invalidateQueries({ queryKey: ["fil"] });
    },
  });

  function fermer() {
    setOuvert(false);
    if (searchParams.get("composer")) {
      searchParams.delete("composer");
      setSearchParams(searchParams, { replace: true });
    }
  }

  // Mode édition
  if (ouvert) {
    return (
      <div
        className="card comp"
        style={{ flexDirection: "column", alignItems: "stretch" }}
      >
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <Avatar profil={profil} />
          <div style={{ flex: 1, fontWeight: 600 }}>{profil?.nom_affiche}</div>
          <button className="btn alt" onClick={fermer}>
            Annuler
          </button>
        </div>

        <textarea
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          placeholder="Partage une parole, un témoignage, une prière…"
          autoFocus
          rows={4}
          style={{
            marginTop: 12,
            padding: 14,
            borderRadius: 14,
            border: "1px solid var(--line)",
            background: "var(--bg)",
            color: "var(--ink)",
            font: "inherit",
            resize: "vertical",
          }}
        />

        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            marginTop: 12,
          }}
        >
          <button className="btn fl" onClick={() => navigate("/video/publier")}>
            <Icon name="plus" />
            Vidéo
          </button>
          <button
            className="btn"
            onClick={() => mutation.mutate()}
            disabled={!texte.trim() || mutation.isPending}
          >
            {mutation.isPending ? "Publication…" : "Publier"}
          </button>
        </div>
      </div>
    );
  }

  // MOBILE : pas de composer (le bouton + du Dock ouvre le mode édition)
  if (estMobile) {
    return null;
  }

  // DESKTOP : composer classique
  return (
    <div className="card comp">
      <Avatar profil={profil} />
      <button className="say" onClick={() => setOuvert(true)}>
        Quelle parole veux-tu partager aujourd'hui ?
      </button>
      <button className="btn fl" onClick={() => navigate("/video/publier")}>
        <Icon name="plus" />
        Vidéo
      </button>
    </div>
  );
}
