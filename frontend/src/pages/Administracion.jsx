import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import EstiloPagina from "../components/EstiloPagina";
import { api, limpiarSesion } from "../services/api";

export default function Administracion() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [students, setStudents] = useState([]);
  const [activity, setActivity] = useState({ groups: [], rooms: [] });
  const [contacts, setContacts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState("all");
  const [recipientId, setRecipientId] = useState("");
  const [notificationText, setNotificationText] = useState("");
  const [message, setMessage] = useState("Verificando acceso…");
  const [contactReplies, setContactReplies] = useState({});
  async function cargarDatos() {
    try {
      const [studentResult, activityResult, contactResult, notificationResult] =
        await Promise.all([
          api.get("/admin/students"),
          api.get("/admin/activity"),
          api.get("/contact"),
          api.get("/admin/notifications"),
        ]);
      setStudents(studentResult.students || []);
      setActivity(activityResult);
      setContacts(contactResult.messages || []);
      setNotifications(notificationResult.notifications || []);
      setMessage("");
    } catch (error) {
      setMessage(error.message || "No se pudieron cargar los datos.");
    }
  }
  useEffect(() => {
    api
      .get("/users/me")
      .then(({ user }) => {
        if (user.role !== "admin") {
          setMessage("No tienes permisos de administrador.");
          return;
        }
        setAdmin(user);
        cargarDatos();
      })
      .catch(() => {
        limpiarSesion();
        navigate("/login", { replace: true });
      });
  }, []);
  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return students;
    return students.filter((student) =>
      [
        student.fullName,
        student.email,
        student.university,
        student.career,
        ...(student.subjects || []),
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(term),
      ),
    );
  }, [students, search]);
  const stats = {
    users: students.length,
    universities: new Set(
      students.map((item) => item.university).filter(Boolean),
    ).size,
    subjects: new Set(students.flatMap((item) => item.subjects || [])).size,
    premium: students.filter((item) => item.plan === "premium").length,
  };
  function cerrarSesion() {
    limpiarSesion();
    navigate("/login");
  }
  async function actualizarCuenta(
    student,
    accountStatus = student.accountStatus,
    plan = student.plan,
  ) {
    try {
      await api.patch(`/admin/students/${student.id}`, { accountStatus, plan });
      await cargarDatos();
      setSelected((current) =>
        current?.id === student.id
          ? { ...student, accountStatus, plan }
          : current,
      );
    } catch (error) {
      window.alert(error.message || "No se pudo actualizar la cuenta.");
    }
  }
  async function enviarAviso() {
    if (!notificationText.trim())
      return setMessage("Escribe el mensaje antes de enviarlo.");
    try {
      const result = await api.post("/admin/notifications", {
        content: notificationText.trim(),
        recipientId: mode === "individual" ? recipientId : "",
      });
      setNotificationText("");
      setMessage(
        mode === "all"
          ? `Comunicado enviado a ${result.count} estudiante(s).`
          : "Mensaje enviado a la bandeja del estudiante.",
      );
      cargarDatos();
    } catch (error) {
      setMessage(error.message || "No se pudo enviar el mensaje.");
    }
  }
  async function eliminarAviso(id) {
    if (
      !window.confirm("¿Eliminar este aviso? El estudiante ya no podrá verlo.")
    )
      return;
    try {
      await api.delete(`/admin/notifications/${id}`);
      cargarDatos();
    } catch (error) {
      window.alert(error.message);
    }
  }
  async function guardarRespuesta(id) {
    const reply = (contactReplies[id] || "").trim();
    if (!reply)
      return window.alert("Escribe una respuesta antes de guardarla.");
    try {
      await api.patch(`/contact/${id}`, { reply });
      cargarDatos();
    } catch (error) {
      window.alert(error.message || "No se pudo guardar la respuesta.");
    }
  }
  async function enviarRespuesta(id) {
    const reply = (contactReplies[id] || "").trim();
    if (!reply) return window.alert("Escribe una respuesta antes de enviarla.");
    try {
      await api.patch(`/contact/${id}`, { reply });
      await api.post(`/contact/${id}/send`, {});
      window.alert("Respuesta enviada al correo de la persona.");
      cargarDatos();
    } catch (error) {
      window.alert(error.message || "No se pudo enviar el correo.");
    }
  }
  if (!admin)
    return (
      <>
        <EstiloPagina archivos={["AdminStyle.css"]} />
        <main className="pagina-admin">
          <section className="tarjeta-estado">
            <p className="etiqueta">JOINCREW</p>
            <h1>{message}</h1>
            <p>
              {message.includes("permisos")
                ? "Este panel está reservado para la administración de JoinCrew."
                : "Un momento, estamos cargando el panel administrativo."}
            </p>
            {message.includes("permisos") && (
              <Link className="boton-principal" to="/app">
                Ir a mi espacio
              </Link>
            )}
          </section>
        </main>
      </>
    );
  return (
    <>
      <EstiloPagina archivos={["AdminStyle.css"]} />
      <main className="pagina-admin">
        <header className="encabezado-admin">
          <Link className="marca" to="/">
            <img src="/img/LOGOJC2.png" alt="JoinCrew" />
          </Link>
          <div className="acciones-admin">
            <span>{admin.fullName || "Administradora"}</span>
            <Link to="/admin">Mi panel</Link>
            <button type="button" onClick={cerrarSesion}>
              Cerrar sesión
            </button>
          </div>
        </header>
        <div className="intro-panel">
          <div>
            <p className="etiqueta">PANEL DE ADMINISTRACIÓN</p>
            <h1>Resumen de JoinCrew</h1>
            <p>Gestiona y consulta la actividad de la comunidad.</p>
          </div>
          <button
            className="boton-principal"
            type="button"
            onClick={cargarDatos}
          >
            Actualizar datos
          </button>
        </div>
        <section className="cuadricula-datos">
          <DatoResumen
            icon="👥"
            label="Estudiantes registrados"
            value={stats.users}
          />
          <DatoResumen
            icon="🎓"
            label="Universidades registradas"
            value={stats.universities}
          />
          <DatoResumen
            icon="📚"
            label="Materias indicadas"
            value={stats.subjects}
          />
          <DatoResumen
            icon="⭐"
            label="Estudiantes Premium"
            value={stats.premium}
          />
        </section>
        <section className="seccion-admin redactor-avisos">
          <div className="encabezado-seccion">
            <div>
              <p className="etiqueta">COMUNICADOS</p>
              <h2>Enviar mensaje</h2>
              <p>
                Envía un aviso individual o comunícalo a todos los estudiantes
                registrados.
              </p>
            </div>
          </div>
          <div className="selector-destino-aviso" role="group">
            <button
              className={mode === "all" ? "active" : ""}
              type="button"
              onClick={() => setMode("all")}
            >
              Todos los estudiantes
            </button>
            <button
              className={mode === "individual" ? "active" : ""}
              type="button"
              onClick={() => setMode("individual")}
            >
              Un estudiante
            </button>
          </div>
          {mode === "individual" && (
            <label className="destinatario-aviso">
              Destinatario
              <select
                value={recipientId}
                onChange={(event) => setRecipientId(event.target.value)}
              >
                <option value="">Selecciona un estudiante</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.fullName} · {student.email}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="etiqueta-contenido-aviso">
            Mensaje
            <textarea
              maxLength="1000"
              value={notificationText}
              onChange={(event) => setNotificationText(event.target.value)}
              placeholder="Escribe un comunicado claro y útil para la comunidad."
            />
          </label>
          <div className="pie-redactor-avisos">
            <p>{message}</p>
            <button
              className="boton-principal"
              type="button"
              onClick={enviarAviso}
            >
              {mode === "all" ? "Enviar a todos" : "Enviar mensaje"}
            </button>
          </div>
        </section>
        <section className="seccion-admin seccion-avisos-enviados">
          <TituloSeccion
            eyebrow="HISTORIAL"
            title="Mensajes enviados"
            text="Elimina un aviso para retirarlo de la bandeja del estudiante."
          />
          <p className="mensaje-tabla">
            {notifications.length} aviso(s) enviados recientemente.
          </p>
          <div className="lista-actividad-admin">
            {notifications.length
              ? notifications.map((item) => (
                  <article className="aviso-enviado" key={item.id}>
                    <strong>{item.content}</strong>
                    <span>
                      {item.recipientName
                        ? `Para ${item.recipientName} · `
                        : ""}
                      {item.readAt ? "Leído" : "Sin leer"} ·{" "}
                      {new Date(item.createdAt).toLocaleDateString("es-EC")}
                    </span>
                    <button
                      type="button"
                      onClick={() => eliminarAviso(item.id)}
                    >
                      Eliminar
                    </button>
                  </article>
                ))
              : "Todavía no has enviado avisos."}
          </div>
        </section>
        <section className="seccion-admin">
          <div className="encabezado-seccion">
            <div>
              <p className="etiqueta">COMUNIDAD</p>
              <h2>Estudiantes registrados</h2>
            </div>
            <label className="etiqueta-buscar">
              Buscar estudiante
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nombre, carrera o universidad"
              />
            </label>
          </div>
          <p className="mensaje-tabla">
            {students.length} estudiante(s) cargado(s).
          </p>
          <div className="contenedor-tabla">
            <table>
              <thead>
                <tr>
                  {[
                    "Estudiante",
                    "Correo",
                    "Universidad",
                    "Carrera",
                    "Materias",
                    "Disponibilidad",
                    "Plan",
                    "Estado",
                    "Acciones",
                  ].map((label) => (
                    <th key={label}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length ? (
                  filteredStudents.map((student) => (
                    <tr key={student.id}>
                      <td>
                        <strong>{student.fullName}</strong>
                      </td>
                      <td>{student.email || "—"}</td>
                      <td>{student.university || "—"}</td>
                      <td>{student.career || "—"}</td>
                      <td>{(student.subjects || []).join(", ") || "—"}</td>
                      <td>{student.availability || "—"}</td>
                      <td>
                        <span
                          className={`etiqueta-rol ${student.plan === "premium" ? "plan-premium" : "rol-usuario"}`}
                        >
                          {student.plan}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`etiqueta-rol ${student.accountStatus === "banned" ? "estado-suspendido" : "rol-admin"}`}
                        >
                          {student.accountStatus === "banned"
                            ? "Suspendida"
                            : "Activa"}
                        </span>
                      </td>
                      <td className="celda-acciones">
                        <button
                          type="button"
                          onClick={() => setSelected(student)}
                        >
                          Ver ficha
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMode("individual");
                            setRecipientId(student.id);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        >
                          Mensaje
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            actualizarCuenta(
                              student,
                              student.accountStatus === "banned"
                                ? "active"
                                : "banned",
                            )
                          }
                        >
                          {student.accountStatus === "banned"
                            ? "Reactivar"
                            : "Suspender"}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="celda-vacia" colSpan="9">
                      No encontramos estudiantes con esa búsqueda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        {selected && (
          <FichaEstudiante
            student={selected}
            onClose={() => setSelected(null)}
            onSave={(plan) =>
              actualizarCuenta(selected, selected.accountStatus, plan)
            }
          />
        )}
        <section className="seccion-admin seccion-actividad">
          <TituloSeccion
            eyebrow="ACTIVIDAD EN TIEMPO REAL"
            title="Grupos creados"
          />
          <p className="mensaje-tabla">
            {activity.groups?.length || 0} grupo(s) registrados.
          </p>
          <div className="lista-actividad-admin">
            {activity.groups?.length
              ? activity.groups.map((group) => (
                  <article key={group.id}>
                    <strong>{group.name}</strong>
                    <span>
                      {group.subject} · {group.modality} · {group.memberCount}/
                      {group.maxMembers} miembros
                    </span>
                    <Link to={`/grupo?id=${group.id}`}>Ver</Link>
                  </article>
                ))
              : "Sin grupos creados todavía."}
          </div>
        </section>
        <section className="seccion-admin seccion-actividad">
          <TituloSeccion eyebrow="SALAS" title="Salas en curso" />
          <p className="mensaje-tabla">
            {activity.rooms?.length || 0} sala(s) registradas.
          </p>
          <div className="lista-actividad-admin">
            {activity.rooms?.length
              ? activity.rooms.map((room) => (
                  <article key={room.id}>
                    <strong>{room.name}</strong>
                    <span>
                      {room.status === "live" ? "En vivo" : "Cerrada"} ·{" "}
                      {room.isPublic ? "Pública" : "Privada"} · máximo{" "}
                      {room.maxParticipants}
                    </span>
                    {room.status === "live" && (
                      <Link to={`/sala?room=${room.id}`}>Abrir sala</Link>
                    )}
                  </article>
                ))
              : "Sin salas creadas todavía."}
          </div>
        </section>
        <section className="seccion-admin seccion-actividad">
          <TituloSeccion eyebrow="CONTACTO" title="Mensajes recibidos" />
          <p className="mensaje-tabla">
            {contacts.length} mensaje(s) recibido(s).
          </p>
          <div className="lista-actividad-admin">
            {contacts.length
              ? contacts.map((item) => (
                  <article className="tarjeta-mensaje-contacto" key={item.id}>
                    <strong>{item.subject}</strong>
                    <span>
                      {item.fullName} · {item.email} ·{" "}
                      {new Date(item.createdAt).toLocaleDateString("es-EC")}
                    </span>
                    <p className="cuerpo-mensaje-contacto">{item.message}</p>
                    {item.adminReply && (
                      <div className="respuesta-contacto-guardada">
                        <b>Respuesta guardada</b>
                        <p>{item.adminReply}</p>
                      </div>
                    )}
                    <div className="editor-respuesta-contacto">
                      <label>
                        Respuesta para {item.fullName}
                        <textarea
                          maxLength="2000"
                          value={
                            contactReplies[item.id] ?? item.adminReply ?? ""
                          }
                          onChange={(event) =>
                            setContactReplies({
                              ...contactReplies,
                              [item.id]: event.target.value,
                            })
                          }
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => guardarRespuesta(item.id)}
                      >
                        Guardar borrador
                      </button>
                      <button
                        type="button"
                        onClick={() => enviarRespuesta(item.id)}
                      >
                        Enviar por Gmail
                      </button>
                    </div>
                  </article>
                ))
              : "Aún no hay mensajes de contacto."}
          </div>
        </section>
      </main>
    </>
  );
}

function DatoResumen({ icon, label, value }) {
  return (
    <article className="tarjeta-dato">
      <span>{icon}</span>
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}
function TituloSeccion({ eyebrow, title, text }) {
  return (
    <div className="encabezado-seccion">
      <div>
        <p className="etiqueta">{eyebrow}</p>
        <h2>{title}</h2>
        {text && <p>{text}</p>}
      </div>
    </div>
  );
}
function FichaEstudiante({ student, onClose, onSave }) {
  const [plan, setPlan] = useState(student.plan);
  return (
    <section className="seccion-admin">
      <div className="encabezado-seccion">
        <div>
          <p className="etiqueta">FICHA DEL ESTUDIANTE</p>
          <h2>{student.fullName}</h2>
        </div>
        <button type="button" onClick={onClose}>
          Cerrar
        </button>
      </div>
      <div className="cuadricula-ficha-estudiante">
        <p>
          <strong>Correo</strong>
          {student.email}
        </p>
        <p>
          <strong>Universidad</strong>
          {student.university || "—"}
        </p>
        <p>
          <strong>Carrera</strong>
          {student.career || "—"}
        </p>
        <p>
          <strong>Materias</strong>
          {(student.subjects || []).join(", ") || "—"}
        </p>
        <p>
          <strong>Disponibilidad</strong>
          {student.availability || "—"}
        </p>
        <p>
          <strong>Modalidad</strong>
          {student.studyPreference || "—"}
        </p>
        <p>
          <strong>Plan actual</strong>
          <select
            value={plan}
            onChange={(event) => setPlan(event.target.value)}
          >
            <option value="free">Free</option>
            <option value="premium">Premium</option>
          </select>
        </p>
      </div>
      <button
        className="boton-principal"
        type="button"
        onClick={() => onSave(plan)}
      >
        Guardar plan
      </button>
    </section>
  );
}
