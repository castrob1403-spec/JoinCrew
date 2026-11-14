import { Outlet } from "react-router";
import EstiloPagina from "./EstiloPagina";

export default function MarcoAcceso() {
  return (
    <main className="pagina-acceso">
      <EstiloPagina archivos={["auth.css"]} />
      <Outlet />
    </main>
  );
}
