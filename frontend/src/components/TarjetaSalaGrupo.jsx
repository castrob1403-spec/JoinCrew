import { Link, useNavigate } from "react-router";
import { api } from "../services/api";

export default function TarjetaSalaGrupo({
  group,
  user,
  room,
  onChanged,
  showChatLink = false,
}) {
  const navigate = useNavigate();
  const isLeader = String(group.createdBy) === String(user.id);
  async function iniciarSala() {
    try {
      const { room: created } = await api.post(`/groups/${group.id}/rooms`);
      navigate(`/sala?room=${created.id}&group=${group.id}`);
    } catch (error) {
      onChanged(error.message || "No se pudo iniciar la llamada privada.");
    }
  }
  async function finalizarSala() {
    if (!window.confirm("¿Finalizar esta llamada para todo el grupo?")) return;
    try {
      await api.delete(`/groups/${group.id}/rooms/${room.id}`);
      onChanged("Llamada privada finalizada.", true);
    } catch (error) {
      onChanged(error.message || "No se pudo finalizar la llamada.");
    }
  }
  if (!room)
    return (
      <aside className="tarjeta-sala-grupo">
        <div>
          <p className="etiqueta">REUNIÓN PRIVADA</p>
          <h2>{isLeader ? "Sin llamada activa" : "Sección restringida"}</h2>
          <p>
            {isLeader
              ? "Inicia una videollamada solo para las personas de este grupo."
              : "Comunícate con el líder para que abra una llamada privada para el grupo."}
          </p>
        </div>
        {isLeader ? (
          <button className="principal" type="button" onClick={iniciarSala}>
            Iniciar llamada privada
          </button>
        ) : showChatLink ? (
          <Link className="secundario" to={`/grupo-chat?group=${group.id}`}>
            Ir al chat
          </Link>
        ) : null}
      </aside>
    );
  return (
    <aside className="tarjeta-sala-grupo">
      <div>
        <p className="etiqueta">REUNIÓN PRIVADA ACTIVA</p>
        <h2>{room.name}</h2>
        <p>Solo las personas de este grupo pueden unirse.</p>
      </div>
      <div className="acciones-sala">
        <Link
          className="principal"
          to={`/sala?room=${room.id}&group=${group.id}`}
        >
          Unirse a la llamada
        </Link>
        {isLeader && (
          <button
            className="boton-peligro"
            type="button"
            onClick={finalizarSala}
          >
            Finalizar llamada
          </button>
        )}
      </div>
    </aside>
  );
}
