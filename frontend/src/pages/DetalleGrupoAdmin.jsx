import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { api, limpiarSesion } from "../services/api";

function nombreRol(role) {
  if (role === "leader") return "Líder";
  if (role === "moderator") return "Moderador";
  return "Miembro";
}

export default function DetalleGrupoAdmin() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const groupId = search.get("id");
  const [admin, setAdmin] = useState(null);
  const [group, setGroup] = useState(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("Verificando acceso…");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function cargarGrupo() {
      try {
        const { user } = await api.get("/users/me");
        if (user.role !== "admin") {
          setMessage("No tienes permisos de administrador.");
          return;
        }

        setAdmin(user);
        if (!groupId) {
          setMessage("No se seleccionó ningún grupo.");
          return;
        }

        try {
          const result = await api.get(`/admin/groups/${groupId}`);
          setGroup(result.group);
          setMessage("");
        } catch (error) {
          setMessage(error.message || "No se pudo cargar el grupo.");
        }
      } catch {
        limpiarSesion();
        navigate("/login", { replace: true });
      }
    }

    cargarGrupo();
  }, [groupId, navigate]);

  async function eliminarGrupo() {
    const motivo = reason.trim();
    if (motivo.length < 3) {
      setMessage("Escribe el motivo de la eliminación antes de continuar.");
      return;
    }

    if (
      !window.confirm(
        `¿Eliminar el grupo “${group.name}”? Se cerrarán sus salas, se borrará su chat y el líder recibirá el motivo.`,
      )
    )
      return;

    try {
      setDeleting(true);
      const result = await api.delete(`/admin/groups/${group.id}`, {
        reason: motivo,
      });
      window.alert(result.message || "Grupo eliminado correctamente.");
      navigate("/admin", { replace: true });
    } catch (error) {
      setMessage(error.message || "No se pudo eliminar el grupo.");
    } finally {
      setDeleting(false);
    }
  }

  if (!admin || !group) {
    return (
      <main className="pagina-admin">
        <section className="tarjeta-estado">
          <p className="etiqueta">ADMINISTRACIÓN</p>
          <h1>{message}</h1>
          <Link className="boton-principal" to="/admin">
            Volver al panel
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="pagina-admin">
      <header className="encabezado-admin">
        <Link className="marca" to="/">
          <img src="/img/LOGOJC2.png" alt="JoinCrew" />
        </Link>
        <div className="acciones-admin">
          <span>{admin.fullName || "Administradora"}</span>
          <Link to="/admin">Mi panel</Link>
          <button type="button" onClick={() => {
            limpiarSesion();
            navigate("/login");
          }}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <section className="intro-panel">
        <div>
          <p className="etiqueta">DETALLE DEL GRUPO</p>
          <h1>{group.name}</h1>
          <p>{group.description || "El grupo no tiene descripción."}</p>
        </div>
        <Link className="boton-principal" to="/admin">
          ← Volver al panel
        </Link>
      </section>

      <section className="seccion-admin ficha-grupo-admin">
        <div className="cuadricula-ficha-grupo">
          <p>
            Materia
            <strong>{group.subject}</strong>
          </p>
          <p>
            Modalidad
            <strong>{group.modality}</strong>
          </p>
          <p>
            Integrantes
            <strong>
              {group.members.length} de {group.maxMembers}
            </strong>
          </p>
          <p>
            Creado
            <strong>
              {new Date(group.createdAt).toLocaleDateString("es-EC")}
            </strong>
          </p>
        </div>
      </section>

      <section className="seccion-admin">
        <div className="encabezado-seccion">
          <div>
            <p className="etiqueta">RESPONSABLE DEL GRUPO</p>
            <h2>Líder</h2>
          </div>
        </div>
        <article className="tarjeta-lider-grupo">
          <div className="avatar-admin">
            {(group.leader.fullName || "L").charAt(0).toUpperCase()}
          </div>
          <div>
            <strong>{group.leader.fullName}</strong>
            <span>{group.leader.email || "Sin correo disponible"}</span>
            <small>
              {[group.leader.university, group.leader.career]
                .filter(Boolean)
                .join(" · ") || "Perfil académico no disponible"}
            </small>
          </div>
          <b className="etiqueta-rol rol-lider">Líder</b>
        </article>
      </section>

      <section className="seccion-admin">
        <div className="encabezado-seccion">
          <div>
            <p className="etiqueta">COMUNIDAD DEL GRUPO</p>
            <h2>Integrantes</h2>
          </div>
        </div>
        <div className="lista-integrantes-admin">
          {group.members.map((member) => (
            <article className="integrante-admin" key={member.id}>
              <div className="avatar-admin">
                {(member.fullName || "E").charAt(0).toUpperCase()}
              </div>
              <div>
                <strong>{member.fullName}</strong>
                <span>{member.email || "Sin correo disponible"}</span>
                <small>
                  {[member.university, member.career]
                    .filter(Boolean)
                    .join(" · ") || "Perfil académico no disponible"}
                </small>
              </div>
              <b
                className={`etiqueta-rol ${member.role === "leader" ? "rol-lider" : "rol-usuario"}`}
              >
                {nombreRol(member.role)}
              </b>
            </article>
          ))}
        </div>
      </section>

      <section className="seccion-admin panel-eliminar-grupo">
        <div>
          <p className="etiqueta">MODERACIÓN</p>
          <h2>Eliminar grupo</h2>
          <p>
            Al eliminarlo se cerrarán sus salas, se eliminará su chat y se
            enviará este motivo a la bandeja del líder.
          </p>
        </div>
        <label>
          Motivo de eliminación
          <textarea
            value={reason}
            maxLength="1000"
            onChange={(event) => setReason(event.target.value)}
            placeholder="Explica al líder por qué se eliminó el grupo."
          />
        </label>
        {message && <p className="mensaje-error-admin">{message}</p>}
        <button
          className="boton-eliminar-grupo"
          type="button"
          disabled={deleting}
          onClick={eliminarGrupo}
        >
          {deleting ? "Eliminando grupo…" : "Eliminar grupo y avisar al líder"}
        </button>
      </section>
    </main>
  );
}
