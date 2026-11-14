import { Link, useNavigate } from "react-router";
import { limpiarSesion } from "../services/api";

const links = [
  ["/app", "Explorar", "app"],
  ["/grupos", "Grupos", "groups"],
  ["/chat", "Chat", "chat"],
  ["/calendario", "Calendario", "calendar"],
];

export default function EncabezadoUsuario({ user, active = "" }) {
  const navigate = useNavigate();

  function cerrarSesion() {
    limpiarSesion();
    navigate("/login");
  }

  return (
    <header className="encabezado">
      <Link className="marca" to="/app">
        <img src="/img/LOGOJC2.png" alt="JoinCrew" />
      </Link>
      <nav>
        {links.map(([to, label, key]) => (
          <Link key={key} className={active === key ? "active" : ""} to={to}>
            {label}
          </Link>
        ))}
      </nav>
      <div className="encabezado-derecha">
        <span>{user.fullName?.split(" ")[0] || "Estudiante"}</span>
        <button className="cerrar-sesion" type="button" onClick={cerrarSesion}>
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
