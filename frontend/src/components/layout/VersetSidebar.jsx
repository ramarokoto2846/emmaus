import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { versetsSidebar } from "../../api/endpoints";

const DUREE_MINUTE = 60 * 1000; // 1 minute

export default function VersetSidebar({
  className = "verse",
  position = "auto", // "auto" (sidebar) | "sticky-bottom" (mobile fixe)
}) {
  const [index, setIndex] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const timerRef = useRef(null);

  const { data: versets, isLoading } = useQuery({
    queryKey: ["versets-sidebar"],
    queryFn: versetsSidebar,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const liste = Array.isArray(versets) ? versets : [];

  // Rotation toutes les 60 secondes
  useEffect(() => {
    if (liste.length <= 1) return;
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % liste.length);
      setAnimKey((k) => k + 1);
    }, DUREE_MINUTE);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [liste.length]);

  useEffect(() => {
    setIndex(0);
    setAnimKey((k) => k + 1);
  }, [liste.length]);

  const wrapperClass = [
    className,
    "verse-anim",
    position === "sticky-bottom" ? "verse-mobile-sticky" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (isLoading) {
    return (
      <div className={wrapperClass}>
        <q className="verse-texte">Chargement…</q>
      </div>
    );
  }

  if (liste.length === 0) {
    return (
      <div className={wrapperClass}>
        <q className="verse-texte">
          Aucun verset. Ajoute-en depuis l'administration.
        </q>
      </div>
    );
  }

  const v = liste[index % liste.length];
  if (!v) return null;

  return (
    <div className={wrapperClass}>
      <q key={animKey} className="verse-texte">
        « {v.texte} »
      </q>
      <span className="verse-ref">
        {v.reference}
        {liste.length > 1 && (
          <span className="verse-dots">
            {liste.map((_, i) => (
              <span
                key={i}
                className={`verse-dot ${i === index ? "on" : ""}`}
              />
            ))}
          </span>
        )}
      </span>
    </div>
  );
}
