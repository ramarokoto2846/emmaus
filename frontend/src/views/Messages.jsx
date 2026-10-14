import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FiTrash2, FiChevronLeft } from "react-icons/fi";
import Avatar from "../components/ui/Avatar";
import NomUtilisateur from "../components/ui/NomUtilisateur";
import { useConfirmation } from "../components/ui/Confirmation";
import { useToast } from "../components/ui/Toast";
import { useAuthStore } from "../store/authStore";
import {
  conversation,
  conversations,
  conversationMessages,
  envoyerMessage,
  supprimerMessage,
} from "../api/endpoints";
import { formatRelative } from "../utils/format";

export default function Messages() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const monProfil = useAuthStore((s) => s.profil);
  const [texte, setTexte] = useState("");
  const [recherche, setRecherche] = useState("");
  const [estMobile, setEstMobile] = useState(
    typeof window !== "undefined" && window.innerWidth <= 720
  );
  const basRef = useRef(null);

  useEffect(() => {
    function onResize() {
      setEstMobile(window.innerWidth <= 720);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const { data: convs } = useQuery({
    queryKey: ["conversations"],
    queryFn: conversations,
    refetchInterval: 15_000,
  });

  const { data: activeConvData } = useQuery({
    queryKey: ["conversation", id],
    queryFn: () => conversation(id),
    enabled: !!id,
  });

  const { data: messages } = useQuery({
    queryKey: ["messages", id],
    queryFn: () => conversationMessages(id),
    enabled: !!id,
    refetchInterval: 5_000,
  });

  const envoiMutation = useMutation({
    mutationFn: (t) => envoyerMessage(id, t),
    onSuccess: () => {
      setTexte("");
      qc.invalidateQueries({ queryKey: ["messages", id] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  useEffect(() => {
    const el = basRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    });
  }, [id, messages?.length]);

  const listeComplete = convs?.results || convs || [];
  const messagesBruts = Array.isArray(messages)
    ? messages
    : messages?.results || [];
  const messagesList = [...messagesBruts].reverse();
  const activeConv =
    listeComplete.find((c) => c.id === id) || activeConvData;

  function autreMembre(conv) {
    if (conv?.interlocuteur) return conv.interlocuteur;
    if (!conv?.membres) return null;
    return (
      conv.membres.find((m) => m.id !== monProfil?.id) || conv.membres[0]
    );
  }

  const liste = listeComplete.filter((c) => {
    if (!recherche.trim()) return true;
    const autre = autreMembre(c);
    const nom = (autre?.nom_affiche || "").toLowerCase();
    const pseudo = (autre?.pseudo || "").toLowerCase();
    const txt = (c.dernier_message?.texte || "").toLowerCase();
    const q = recherche.toLowerCase();
    return nom.includes(q) || pseudo.includes(q) || txt.includes(q);
  });

  function send() {
    const t = texte.trim();
    if (!t || !id) return;
    envoiMutation.mutate(t);
  }

  function estMonMessage(m) {
    return m.expediteur?.id && monProfil?.id && m.expediteur.id === monProfil.id;
  }

  function apercu(conv) {
    const txt = conv.dernier_message?.texte || "Nouvelle discussion";
    const prefix =
      conv.dernier_message?.expediteur?.id === monProfil?.id ? "Vous : " : "";
    const complet = prefix + txt;
    if (complet.length <= 40) return complet;
    return complet.slice(0, 40) + "...";
  }

  const modeleListe = estMobile ? !id : true;
  const modeleThread = estMobile ? !!id : true;

  return (
    <>
      <h1 className="vh" style={{ marginBottom: 16 }}>
        Messages
      </h1>
      <div className={`msgs ${estMobile ? "mobile" : ""}`}>
        {/* LISTE */}
        {modeleListe && (
          <div className="card cvl">
            <input
              type="text"
              placeholder="Rechercher une conversation…"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              className="cvl-search"
            />

            {liste.length === 0 ? (
              <p className="sub" style={{ padding: 12 }}>
                {recherche
                  ? "Aucun résultat."
                  : "Aucune conversation. Commence une discussion depuis le profil d'un membre."}
              </p>
            ) : (
              liste.map((c) => {
                const autre = autreMembre(c);
                const nonLu = c.non_lus > 0;
                return (
                  <button
                    key={c.id}
                    className={`cvt ${c.id === id ? "on" : ""}`}
                    onClick={() => navigate(`/messages/${c.id}`)}
                  >
                    <div className="cvt-av-wrap">
                      <Avatar profil={autre} size="sm" />
                      {nonLu && <span className="cvt-dot" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <NomUtilisateur profil={autre} taille="sm" />
                      <small
                        style={{
                          fontStyle: c.dernier_message ? "normal" : "italic",
                        }}
                      >
                        {apercu(c)}
                      </small>
                    </div>
                    {nonLu && (
                      <span className="cvt-badge">{c.non_lus}</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* THREAD */}
        {modeleThread && (
          <div className="card thr">
            <div className="thh">
              {estMobile && id && (
                <button
                  className="thh-back"
                  onClick={() => navigate("/messages")}
                  aria-label="Retour"
                >
                  <FiChevronLeft size={22} />
                </button>
              )}
              {activeConv ? (
                <>
                  <button
                    className="thh-avatar-btn"
                    onClick={() => {
                      const autre = autreMembre(activeConv);
                      if (autre?.id) navigate(`/profil/${autre.id}`);
                    }}
                    aria-label={`Voir le profil de ${autreMembre(activeConv)?.nom_affiche}`}
                  >
                    <Avatar profil={autreMembre(activeConv)} size="sm" />
                  </button>
                  <button
                    className="thh-nom-btn"
                    onClick={() => {
                      const autre = autreMembre(activeConv);
                      if (autre?.id) navigate(`/profil/${autre.id}`);
                    }}
                  >
                    <NomUtilisateur profil={autreMembre(activeConv)} taille="sm" />
                    <br />
                    <small className="sub">En ligne</small>
                  </button>
                </>
              ) : (
                <p className="sub">Sélectionne une conversation</p>
              )}
            </div>

            <div className="thb" ref={basRef}>
              {messagesList.map((m) => (
                <BulleMessage
                  key={m.id}
                  message={m}
                  moi={estMonMessage(m)}
                  conversationId={id}
                />
              ))}
            </div>

            <div className="thf">
              <input
                value={texte}
                onChange={(e) => setTexte(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Écris un message…"
                disabled={!id}
              />
              <button className="btn" onClick={send} disabled={!id}>
                Envoyer
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function BulleMessage({ message, moi, conversationId }) {
  const qc = useQueryClient();
  const confirmer = useConfirmation();
  const { afficher: afficherToast } = useToast();
  const [menuOuvert, setMenuOuvert] = useState(false);
  const ref = useRef(null);

  const supprMutation = useMutation({
    mutationFn: () => supprimerMessage(message.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      afficherToast("Le message a été supprimé.", {
        type: "success",
        titre: "Message supprimé",
      });
    },
  });

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setMenuOuvert(false);
      }
    }
    if (menuOuvert) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOuvert]);

  async function supprimer(e) {
    e.stopPropagation();
    setMenuOuvert(false);
    const ok = await confirmer({
      titre: "Supprimer ce message ?",
      message: "Cette action est définitive.",
      labelConfirmer: "Supprimer",
      labelAnnuler: "Annuler",
      danger: true,
    });
    if (ok) supprMutation.mutate();
  }

  return (
    <div className={`bb-wrap ${moi ? "moi" : "autre"}`}>
      {!moi && <Avatar profil={message.expediteur} size="sm" />}
      <div
        className={`bb ${moi ? "m" : "o"}`}
        onClick={() => moi && setMenuOuvert((v) => !v)}
        style={{
          cursor: moi ? "pointer" : "default",
          position: "relative",
        }}
        ref={moi ? ref : null}
      >
        <span className="bb-txt">{message.texte}</span>
        <span className="bb-time">{formatRelative(message.cree_le)}</span>

        {moi && menuOuvert && (
          <div className="bb-menu" onClick={(e) => e.stopPropagation()}>
            <button onClick={supprimer}>
              <FiTrash2 size={14} /> Supprimer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
