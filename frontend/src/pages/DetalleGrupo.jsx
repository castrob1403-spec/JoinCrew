import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import EncabezadoUsuario from "../components/EncabezadoUsuario";
import { useUsuario } from "../components/Usuario";
import TarjetaSalaGrupo from "../components/TarjetaSalaGrupo";
import { api } from "../services/api";

export default function DetalleGrupo() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const groupId = search.get("id");
  const { user } = useUsuario();
  const [group, setGroup] = useState(null);
  const [room, setRoom] = useState(null);
  const [message, setMessage] = useState("Cargando grupo…");
  async function cargarGrupo() {
    if (!groupId) return navigate("/grupos", { replace: true });
    try {
      const { group: item } = await api.get(`/groups/${groupId}`);
      setGroup(item);
      setMessage("");
      const isMember = item.members.some(
        (member) => String(member.id) === String(user.id),
      );
      if (isMember) {
        const { rooms } = await api.get(`/groups/${groupId}/rooms`);
        setRoom(rooms[0] || null);
      }
    } catch (error) {
      setMessage(error.message || "Este grupo no está disponible.");
    }
  }
  useEffect(() => {
    if (user && groupId) cargarGrupo();
  }, [user, groupId]);
  useEffect(() => {
    if (!group || !user) return;
    const timer = window.setInterval(async () => {
      try {
        const { rooms } = await api.get(`/groups/${group.id}/rooms`);
        setRoom(rooms[0] || null);
      } catch {}
    }, 8000);
    return () => window.clearInterval(timer);
  }, [group, user]);
  async function unirse() {
    try {
      await api.post(`/groups/${groupId}/unirse`);
      setMessage("Te uniste al grupo.");
      cargarGrupo();
    } catch (error) {
      setMessage(error.message);
    }
  }
  async function cambiarRol(memberId, role) {
    try {
      await api.patch(`/groups/${groupId}/members/${memberId}`, { role });
      setMessage("Rol actualizado.");
      cargarGrupo();
    } catch (error) {
      setMessage(error.message);
    }
  }
  async function retirarMiembro(memberId) {
    if (!window.confirm("¿Retirar a este integrante del grupo?")) return;
    try {
      await api.delete(`/groups/${groupId}/members/${memberId}`);
      setMessage("Integrante retirado.");
      cargarGrupo();
    } catch (error) {
      setMessage(error.message);
    }
  }
  async function disolverGrupo() {
    if (
      !window.confirm("¿Disolver este grupo? Esta acción no se puede deshacer.")
    )
      return;
    try {
      await api.delete(`/groups/${groupId}`);
      navigate("/grupos");
    } catch (error) {
      setMessage(error.message);
    }
  }
  if (!user)
    return (
      <>
        <main className="pagina">
          <p>Cargando…</p>
        </main>
      </>
    );
  if (!group)
    return (
      <>
        <EncabezadoUsuario user={user} active="groups" />
        <main className="pagina">
          <Link className="volver-lista" to="/grupos">
            ← Volver a grupos
          </Link>
          <p className="mensaje">{message}</p>
        </main>
      </>
    );
  const isLeader = String(group.createdBy) === String(user.id);
  const isMember = group.members.some(
    (member) => String(member.id) === String(user.id),
  );
  const leader = group.members.find((member) => member.role === "leader");
  return (
    <>
      <EncabezadoUsuario user={user} active="groups" />
      <main className="pagina">
        <Link className="volver-lista" to="/grupos">
          ← Volver a grupos
        </Link>
        <p className="etiqueta">DETALLE DEL GRUPO</p>
        <h1 className="titulo-pagina">{group.name}</h1>
        <p className="subtitulo">
          {group.description || "Sin descripción disponible."}
        </p>
        <p className="mensaje exito">{message}</p>
        <section className="tarjeta tarjeta-info-grupo">
          <div className="cuadricula-info-grupo">
            <div>
              <span className="etiqueta-info">MATERIA</span>
              <strong>{group.subject}</strong>
            </div>
            <div>
              <span className="etiqueta-info">MODALIDAD</span>
              <strong>{group.modality}</strong>
            </div>
            <div>
              <span className="etiqueta-info">INTEGRANTES</span>
              <strong>
                {group.members.length} de {group.maxMembers}
              </strong>
            </div>
            <div>
              <span className="etiqueta-info">LÍDER</span>
              <strong>{leader?.fullName || "Líder del grupo"}</strong>
            </div>
          </div>
          <div className="acciones-grupo">
            {isMember ? (
              <Link className="principal" to={`/grupo-chat?group=${group.id}`}>
                Abrir chat del grupo
              </Link>
            ) : (
              <button className="principal" type="button" onClick={unirse}>
                Unirme al grupo
              </button>
            )}
            {isLeader && (
              <button
                className="boton-peligro"
                type="button"
                onClick={disolverGrupo}
              >
                Disolver grupo
              </button>
            )}
          </div>
        </section>
        {isMember && (
          <TarjetaSalaGrupo
            group={group}
            user={user}
            room={room}
            onChanged={(text) => {
              setMessage(text);
              cargarGrupo();
            }}
            showChatLink
          />
        )}
        <section className="seccion-lista">
          <div className="fila-titulo-seccion">
            <h2>Integrantes</h2>
            <span className="puntaje">
              {group.members.length} integrante(s)
            </span>
          </div>
          <div className="lista-miembros">
            {group.members.map((member) => {
              const canManage =
                isLeader && String(member.id) !== String(user.id);
              return (
                <article className="fila-miembro" key={member.id}>
                  <div className="avatar avatar-chico">
                    {(member.fullName || "E").charAt(0).toUpperCase()}
                  </div>
                  <div className="datos-miembro">
                    <strong>{member.fullName}</strong>
                    <span>{member.career || "Perfil académico"}</span>
                  </div>
                  <span className="nombre-rol">
                    {member.role === "leader"
                      ? "Líder"
                      : member.role === "moderator"
                        ? "Moderador"
                        : "Miembro"}
                  </span>
                  {canManage && (
                    <div className="controles-miembro">
                      <select
                        value={member.role}
                        onChange={(event) =>
                          cambiarRol(member.id, event.target.value)
                        }
                      >
                        <option value="member">Miembro</option>
                        <option value="moderator">Moderador</option>
                      </select>
                      <button
                        className="retirar-miembro"
                        type="button"
                        onClick={() => retirarMiembro(member.id)}
                      >
                        Retirar
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}
