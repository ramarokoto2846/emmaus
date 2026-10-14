import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import RightPanel from "./RightPanel";
import Dock from "./Dock";
import VersetSidebar from "./VersetSidebar";
import { useAuthStore } from "../../store/authStore";
import { moi, monProfil } from "../../api/endpoints";

export default function AppLayout() {
  const setUser = useAuthStore((s) => s.setUser);
  const setProfil = useAuthStore((s) => s.setProfil);
  const user = useAuthStore((s) => s.user);
  const profil = useAuthStore((s) => s.profil);
  const [estMobile, setEstMobile] = useState(
    typeof window !== "undefined" && window.innerWidth <= 1100
  );

  useEffect(() => {
    function onResize() {
      setEstMobile(window.innerWidth <= 1100);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!user || !profil) {
      Promise.all([moi(), monProfil()])
        .then(([u, p]) => {
          setUser(u);
          setProfil(p);
        })
        .catch((e) => console.error("Hydratation échouée :", e));
    }
  }, [user, profil, setUser, setProfil]);

  return (
    <>
      <div className="app">
        <Sidebar />
        <main>
          <TopBar />

          {/* Verset mobile : sticky sous le TopBar */}
          {estMobile && (
            <div className="verse-topbar-wrapper">
              <VersetSidebar className="verse verse-topbar" />
            </div>
          )}

          <Outlet />
        </main>
        <RightPanel />
      </div>
      <Dock />
    </>
  );
}
