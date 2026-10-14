import { useInfiniteQuery } from "@tanstack/react-query";
import LivesStrip from "../components/feed/LivesStrip";
import Composer from "../components/feed/Composer";
import Post from "../components/feed/Post";
import { fil } from "../api/endpoints";

export default function Feed() {
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["fil"],
    queryFn: ({ pageParam }) => fil({ curseur: pageParam }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage?.next) return undefined;
      try {
        const url = new URL(lastPage.next);
        return url.searchParams.get("curseur");
      } catch {
        return undefined;
      }
    },
  });

  const publications = data?.pages.flatMap((p) => p.results) || [];

  return (
    <>
      <LivesStrip />
      <Composer />

      {isLoading && <p className="sub">Chargement du fil…</p>}

      {isError && (
        <div className="card post">
          <p className="sub">
            Impossible de charger le fil. Vérifie que le backend tourne et que tu es
            connecté.
          </p>
        </div>
      )}

      {!isLoading && publications.length === 0 && (
        <div className="card post">
          <p className="sub">
            Aucune publication pour l'instant. Sois le premier à partager une
            parole !
          </p>
        </div>
      )}

      {publications.map((p) => (
        <Post key={p.id} publication={p} />
      ))}

      {hasNextPage && (
        <button
          className="btn alt"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          style={{ display: "block", margin: "20px auto" }}
        >
          {isFetchingNextPage ? "Chargement…" : "Charger plus"}
        </button>
      )}
    </>
  );
}
