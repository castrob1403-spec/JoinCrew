import { useEffect, useState } from "react";
import EncabezadoUsuario from "../components/EncabezadoUsuario";
import { useUsuario } from "../components/Usuario";
import { api } from "../services/api";
import { formatearFecha } from "../utilidades";

export default function Avisos() {
  const { user } = useUsuario();
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState("Cargando notificaciones…");
  useEffect(() => {
    if (!user) return;
    api
      .get("/users/me/notifications")
      .then(({ notifications }) => {
        setItems(notifications || []);
        setMessage("");
        return api.patch("/users/me/notifications/read", {});
      })
      .catch(() => setMessage("No pudimos cargar tus notificaciones."));
  }, [user]);
  if (!user)
    return (
      <>
        <main className="pagina">
          <p>Cargando…</p>
        </main>
      </>
    );
  return (
    <>
      <EncabezadoUsuario user={user} />
      <main className="pagina-avisos">
        <section className="portada-avisos">
          <p className="etiqueta">TU BANDEJA</p>
          <h1>Notificaciones</h1>
          <p>
            Encuentra aquí los comunicados y mensajes enviados por la
            administración de JoinCrew.
          </p>
        </section>
        <section className="bandeja-avisos">
          <div className="encabezado-bandeja">
            <h2>Todos tus mensajes</h2>
            <span>
              {items.length
                ? `${items.length} mensaje${items.length === 1 ? "" : "s"}`
                : ""}
            </span>
          </div>
          {message && <p className="estado-avisos">{message}</p>}
          <div className="lista-bandeja-avisos">
            {items.length
              ? items.map((item) => (
                  <article
                    className={`item-bandeja ${item.readAt ? "read" : "sin-leer"}`}
                    key={item.id}
                  >
                    <span className="icono-bandeja">🔔</span>
                    <div>
                      <strong>Mensaje de JoinCrew</strong>
                      <p>{item.content}</p>
                      <small>
                        {formatearFecha(item.createdAt, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </small>
                    </div>
                  </article>
                ))
              : !message && (
                  <div className="bandeja-vacia">
                    <span>✨</span>
                    <p>Tu bandeja está al día.</p>
                  </div>
                )}
          </div>
        </section>
      </main>
    </>
  );
}
