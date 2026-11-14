import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import EncabezadoUsuario from "../components/EncabezadoUsuario";
import { useUsuario } from "../components/Usuario";
import EstiloPagina from "../components/EstiloPagina";
import { api } from "../services/api";

export default function Chat() {
  const [search] = useSearchParams();
  const conversationId = search.get("conversation");
  const { user } = useUsuario();
  const [conversations, setConversations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  async function cargarMensajes() {
    if (!conversationId) return;
    try {
      const result = await api.get(`/conversations/${conversationId}/messages`);
      setMessages(result.messages || []);
    } catch (error) {
      setMessage(error.message || "No se pudieron cargar los mensajes.");
    }
  }
  useEffect(() => {
    if (!user) return;
    Promise.all([api.get("/conversations"), api.get("/groups/mine")])
      .then(([conversationsResult, groupsResult]) => {
        setConversations(conversationsResult.conversations || []);
        setGroups(groupsResult.groups || []);
      })
      .catch((error) =>
        setMessage(
          error.message || "No se pudieron cargar las conversaciones.",
        ),
      );
    cargarMensajes();
  }, [user, conversationId]);
  useEffect(() => {
    if (!conversationId || !user) return;
    const timer = window.setInterval(cargarMensajes, 8000);
    return () => window.clearInterval(timer);
  }, [conversationId, user]);
  async function enviarMensaje(event) {
    event.preventDefault();
    if (!content.trim() || !conversationId) return;
    try {
      await api.post(`/conversations/${conversationId}/messages`, {
        content: content.trim(),
      });
      setContent("");
      cargarMensajes();
    } catch (error) {
      setMessage(error.message || "No se pudo enviar el mensaje.");
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
  const activeConversation = conversations.find(
    (item) => String(item.id) === String(conversationId),
  );
  const other = activeConversation?.participants.find(
    (item) => String(item.id) !== String(user.id),
  );
  return (
    <>
      <EstiloPagina archivos={["MemberPages.css"]} />
      <EncabezadoUsuario user={user} active="chat" />
      <main className="pagina">
        <p className="etiqueta">CHAT PRIVADO</p>
        <h1 className="titulo-pagina">
          {other?.fullName || "Tus conversaciones"}
        </h1>
        <p className="subtitulo">
          {other
            ? "Chat privado para coordinar su sesión de estudio."
            : "Elige una coincidencia para empezar a hablar."}
        </p>
        <div className="diseno-chat">
          <aside className="tarjeta panel-chats">
            <h2>Mensajes directos</h2>
            <div className="lista-chats">
              {conversations.length
                ? conversations.map((conversation) => {
                    const participant = conversation.participants.find(
                      (item) => String(item.id) !== String(user.id),
                    );
                    return (
                      <Link
                        className={`enlace-chat ${String(conversation.id) === String(conversationId) ? "seleccionado" : ""}`}
                        to={`/chat?conversation=${conversation.id}`}
                        key={conversation.id}
                      >
                        {participant?.fullName || "Estudiante"}
                      </Link>
                    );
                  })
                : "Aún no tienes conversaciones."}
            </div>
            <h2 className="titulo-chat-grupo">Chats de grupo</h2>
            <div className="lista-chats">
              {groups.length
                ? groups.map((group) => (
                    <Link
                      className="enlace-chat"
                      to={`/grupo-chat?group=${group.id}`}
                      key={group.id}
                    >
                      {group.name}
                    </Link>
                  ))
                : "Aún no te has unido a un grupo."}
            </div>
          </aside>
          <section className="tarjeta ventana-chat">
            <div className="mensajes-chat">
              {conversationId ? (
                messages.map((item) => {
                  const mine = String(item.senderId) === String(user.id);
                  return (
                    <div
                      className={`burbuja ${mine ? "yo" : ""}`}
                      key={item.id}
                    >
                      {!mine && (
                        <>
                          <strong>{item.senderName || "Estudiante"}</strong>
                          <br />
                        </>
                      )}
                      {item.content}
                    </div>
                  );
                })
              ) : (
                <p className="chat-vacio">
                  Selecciona una conversación desde Matches para enviar el
                  primer mensaje.
                </p>
              )}
            </div>
            {conversationId && (
              <form className="formulario-chat" onSubmit={enviarMensaje}>
                <input
                  maxLength="1000"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Escribe un mensaje"
                  required
                />
                <button className="principal" type="submit">
                  Enviar
                </button>
              </form>
            )}
            <p className="mensaje">{message}</p>
          </section>
        </div>
      </main>
    </>
  );
}
