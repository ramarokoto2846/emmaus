import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import { IconSprite } from "./components/ui/Icon";
import AppLayout from "./components/layout/AppLayout";
import Feed from "./views/Feed";
import Discover from "./views/Discover";
import Profile from "./views/Profile";
import Messages from "./views/Messages";
import Me from "./views/Me";
import Parametres from "./views/Parametres";
import Notifications from "./views/Notifications";
import PublierVideo from "./views/PublierVideo";
import Recherche from "./views/Recherche";
import Moderation from "./views/Moderation";
import AdminVersetsSidebar from "./views/AdminVersetsSidebar";
import Login from "./views/Login";
import Register from "./views/Register";

function Protege({ children }) {
  const access = useAuthStore((s) => s.access);
  if (!access) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <>
      <IconSprite />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <Protege>
              <AppLayout />
            </Protege>
          }
        >
          <Route index element={<Feed />} />
          <Route path="decouvrir" element={<Discover />} />
          <Route path="profil/:id" element={<Profile />} />
          <Route path="messages" element={<Messages />} />
          <Route path="messages/:id" element={<Messages />} />
          <Route path="moi" element={<Me />} />
          <Route path="parametres" element={<Parametres />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="video/publier" element={<PublierVideo />} />
          <Route path="recherche" element={<Recherche />} />
          <Route path="moderation" element={<Moderation />} />
          <Route path="admin/versets-sidebar" element={<AdminVersetsSidebar />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
