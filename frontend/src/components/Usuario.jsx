import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { api, limpiarSesion } from "../services/api";

export function useUsuario() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState("Verificando tu acceso…");

  useEffect(() => {
    async function verificarSesion() {
      try {
        const { user: currentUser } = await api.get("/users/me");
        if (currentUser.role === "admin") {
          navigate("/admin", { replace: true });
          return;
        }
        if (currentUser.accountStatus === "banned") {
          limpiarSesion();
          navigate("/login", { replace: true });
          return;
        }
        setUser(currentUser);
      } catch {
        limpiarSesion();
        navigate("/login", { replace: true });
      }
    }
    verificarSesion();
  }, [navigate]);

  return { user, setUser, message };
}

export function Cargando({ mensaje = "Cargando…" }) {
  return (
    <main className="pagina">
      <p className="mensaje">{mensaje}</p>
    </main>
  );
}
