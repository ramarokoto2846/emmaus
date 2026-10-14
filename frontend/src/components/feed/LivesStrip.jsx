import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Avatar from "../ui/Avatar";
import { directsLive } from "../../api/endpoints";

export default function LivesStrip() {
  const navigate = useNavigate();
  const { data: lives } = useQuery({
    queryKey: ["directs-live-strip"],
    queryFn: directsLive,
    refetchInterval: 60_000,
  });

  if (!lives || lives.length === 0) return null;

  return (
    <div className="lives">
      {lives.map((l) => (
        <button
          key={l.id}
          className="lv"
          onClick={() => navigate(`/direct/${l.id}`)}
        >
          <div className="ring">
            <Avatar profil={{ nom_affiche: l.hote_nom, initiales: l.hote_nom?.[0] }} />
          </div>
          <span className="tag">LIVE</span>
          <span>{l.hote_nom}</span>
        </button>
      ))}
    </div>
  );
}
