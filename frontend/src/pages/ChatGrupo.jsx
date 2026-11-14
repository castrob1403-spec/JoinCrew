import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import EncabezadoUsuario from "../components/EncabezadoUsuario";
import { useUsuario } from "../components/Usuario";
import EstiloPagina from "../components/EstiloPagina";
import TarjetaSalaGrupo from "../components/TarjetaSalaGrupo";
import { api } from "../services/api";

export default function ChatGrupo() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const groupId = search.get("group");
  const { user } = useUsuario();
  const [group, setGroup] = useState(null);
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  async function cargarChat() {
    try {
      const { group: item } = await api.get(`/groups/${groupId}`);
      if (
        !item.members.some((member) => String(member.id) === String(user.id))
      ) {
        setMessage("Debes unirte al grupo para usar su chat.");
        return;
      }
      setGroup(item);
      const [messageResult, roomResult] = await Promise.all([
        api.get(`/groups/${groupId}/messages`),
        api.get(`/groups/${groupId}/rooms`),
      ]);
      setMessages(messageResult.messages || []);
      setRoom(roomResult.rooms[0] || null);
    } catch (error) {
      setMessage(error.message || "Este grupo no está disponible.");
    }
  }
  useEffect(() => {
    if (!user || !groupId) {
      if (user) navigate("/grupos", { replace: true });
      return;
    }
    cargarChat();
  }, [user, groupId]);
  useEffect(() => {
    if (!group || !user) return;
    const timer = window.setInterval(cargarChat, 8000);
    return () => window.clearInterval(timer);
  }, [group, user]);
  async function enviarMensaje(event) {
    event.preventDefault();
    const cleanContent = content.trim();
    if (!cleanContent) return;
    try {
      await api.post(`/groups/${groupId}/messages`, { content: cleanContent });
      setContent("");
      cargarChat();
    } catch (error) {
      setMessage(error.message || "No se pudo enviar el mensaje.");
    }
  }
  async function eliminarMensaje(messageId) {
    if (!window.confirm("¿Eliminar este mensaje?")) return;
    try {
      await api.delete(`/groups/${groupId}/messages/${messageId}`);
      cargarChat();
    } catch (error) {
      setMessage(error.message);
    }
  }
  if (!user)
    return (
      <>
        <EstiloPagina archivos={["MemberPages.css"]} />
        <main className="pagina">
          <p>Cargando…</p>
        </main>
      </>
    );
  return (
    <>
      <EstiloPagina archivos={["MemberPages.css"]} />
      <EncabezadoUsuario user={user} active="groups" />
      <main className="pagina">
        <Link
          className="volver-lista"
          to={group ? `/grupo?id=${group.id}` : "/grupos"}
        >
          ← Ver información del grupo
        </Link>
        <p className="etiqueta">CHAT DE GRUPO</p>
        <h1 className="titulo-pagina">{group?.name || "Cargando…"}</h1>
        <p className="subtitulo">
          Coordinen sesiones, compartan recursos y estudien juntos.
        </p>
        <div className="diseno-chat-grupo">
          <section className="tarjeta ventana-chat-grupo">
            <div className="mensajes-chat">
              {messages.map((item) => {
                const mine = String(item.senderId) === String(user.id);
                return (
                  <article
                    className={`burbuja ${mine ? "yo" : ""}`}
                    key={item.id}
                  >
                    {!mine && (
                      <>
                        <strong>{item.senderName || "Estudiante"}</strong>
                        <br />
                      </>
                    )}
                    <span>{item.content}</span>
                    {mine && (
                      <button
                        className="eliminar-mensaje"
                        type="button"
                        onClick={() => eliminarMensaje(item.id)}
                      >
                        Eliminar
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
            {group && (
              <form className="formulario-chat-grupo" onSubmit={enviarMensaje}>
                <input
                  maxLength="1000"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Escribe un mensaje"
                />
                <button className="principal" type="submit">
                  Enviar
                </button>
              </form>
            )}
            <p className="mensaje exito">{message}</p>
          </section>
          {group && (
            <TarjetaSalaGrupo
              group={group}
              user={user}
              room={room}
              onChanged={(text) => {
                setMessage(text);
                cargarChat();
              }}
            />
          )}
        </div>
      </main>
    </>
  );
}
