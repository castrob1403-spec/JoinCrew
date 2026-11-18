import { createRoot } from "react-dom/client";
import { createBrowserRouter, Navigate, Outlet } from "react-router";
import { RouterProvider } from "react-router/dom";
import AsistenteIA from "./components/AsistenteIA";
import MarcoAcceso from "./components/MarcoAcceso";
import EstilosRuta from "./components/EstilosRuta";
import Administracion from "./pages/Administracion";
import Calendario from "./pages/Calendario";
import Chat from "./pages/Chat";
import Contacto from "./pages/Contacto";
import Panel from "./pages/Panel";
import ChatGrupo from "./pages/ChatGrupo";
import DetalleGrupo from "./pages/DetalleGrupo";
import Grupos from "./pages/Grupos";
import Inicio from "./pages/Inicio";
import Ingreso from "./pages/Ingreso";
import Coincidencias from "./pages/Coincidencias";
import Avisos from "./pages/Avisos";
import Premium from "./pages/Premium";
import Perfil from "./pages/Perfil";
import Registro from "./pages/Registro";
import Sala from "./pages/Sala";
import VerificarCorreo from "./pages/VerificarCorreo";

function MarcoPagina() {
  return (
    <>
      <EstilosRuta />
      <Outlet />
    </>
  );
}

function MarcoUsuario() {
  return (
    <>
      <Outlet />
      <AsistenteIA />
    </>
  );
}

const router = createBrowserRouter([
  {
    element: <MarcoPagina />,
    children: [
      { path: "/", element: <Inicio /> },
      { path: "/contacto", element: <Contacto /> },
      {
        element: <MarcoAcceso />,
        children: [
          { path: "/login", element: <Ingreso /> },
          { path: "/registro", element: <Registro /> },
          { path: "/verificar", element: <VerificarCorreo /> },
        ],
      },
      {
        element: <MarcoUsuario />,
        children: [
          { path: "/app", element: <Panel /> },
          { path: "/calendario", element: <Calendario /> },
          { path: "/chat", element: <Chat /> },
          { path: "/grupos", element: <Grupos /> },
          { path: "/grupo", element: <DetalleGrupo /> },
          { path: "/grupo-chat", element: <ChatGrupo /> },
          { path: "/matches", element: <Coincidencias /> },
          { path: "/notificaciones", element: <Avisos /> },
          { path: "/perfil", element: <Perfil /> },
          { path: "/premium", element: <Premium /> },
          { path: "/sala", element: <Sala /> },
        ],
      },
      { path: "/admin", element: <Administracion /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  <RouterProvider router={router} />,
);
