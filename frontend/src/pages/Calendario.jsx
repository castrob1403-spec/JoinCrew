import { useEffect, useState } from "react";
import EncabezadoUsuario from "../components/EncabezadoUsuario";
import { useUsuario } from "../components/Usuario";
import { api } from "../services/api";
import { formatearFecha } from "../utilidades";

const emptyForm = {
  subject: "",
  startsAt: "",
  durationMinutes: "60",
  notes: "",
};

function inicioSemana() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return date;
}

function aFechaLocal(value) {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

export default function Calendario() {
  const { user } = useUsuario();
  const [sessions, setSessions] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [message, setMessage] = useState("Cargando tus sesiones…");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    api
      .get("/calendar")
      .then(({ sessions: items }) => {
        setSessions(items || []);
        setMessage("");
      })
      .catch((error) =>
        setMessage(error.message || "No se pudieron cargar tus sesiones."),
      );
  }, [user]);

  async function guardarSesion(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const payload = {
      ...form,
      startsAt: new Date(form.startsAt).toISOString(),
      durationMinutes: Number(form.durationMinutes),
      notes: form.notes.trim(),
      subject: form.subject.trim(),
    };
    try {
      const result = editingId
        ? await api.patch(`/calendar/${editingId}`, payload)
        : await api.post("/calendar", payload);
      setSessions((current) => {
        const next = editingId
          ? current.map((session) =>
              session.id === editingId ? result.session : session,
            )
          : [...current, result.session];
        return next.sort(
          (first, second) =>
            new Date(first.startsAt) - new Date(second.startsAt),
        );
      });
      setMessage(
        editingId ? "Sesión actualizada." : "Sesión guardada en tu calendario.",
      );
      setForm(emptyForm);
      setEditingId("");
    } catch (error) {
      setMessage(error.message || "No se pudo guardar la sesión.");
    } finally {
      setSaving(false);
    }
  }

  function editarSesion(session) {
    setEditingId(session.id);
    setForm({
      subject: session.subject,
      startsAt: aFechaLocal(session.startsAt),
      durationMinutes: String(session.durationMinutes),
      notes: session.notes || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function eliminarSesion(id) {
    if (!window.confirm("¿Eliminar esta sesión de tu calendario?")) return;
    try {
      await api.delete(`/calendar/${id}`);
      setSessions((current) => current.filter((session) => session.id !== id));
    } catch (error) {
      setMessage(error.message || "No se pudo eliminar la sesión.");
    }
  }

  const firstDay = inicioSemana();
  const upcoming = sessions.filter(
    (session) => new Date(session.startsAt) >= new Date(),
  );
  if (!user)
    return (
      <>
        <main className="pagina">
          <p className="mensaje">Cargando…</p>
        </main>
      </>
    );
  return (
    <>
      <EncabezadoUsuario user={user} active="calendar" />
      <main className="pagina">
        <p className="etiqueta">PLANIFICACIÓN</p>
        <h1 className="titulo-pagina">Tu calendario de estudio</h1>
        <p className="subtitulo">
          Organiza sesiones para mantener el ritmo y estudiar acompañado.
        </p>
        <section className="tarjeta">
          <h2>{editingId ? "Edita tu sesión" : "Agenda una sesión"}</h2>
          <form className="formulario-calendario" onSubmit={guardarSesion}>
            <label>
              Materia
              <input
                required
                maxLength="100"
                value={form.subject}
                onChange={(event) =>
                  setForm({ ...form, subject: event.target.value })
                }
                placeholder="Ej.: Cálculo"
              />
            </label>
            <label>
              Fecha y hora
              <input
                type="datetime-local"
                required
                value={form.startsAt}
                onChange={(event) =>
                  setForm({ ...form, startsAt: event.target.value })
                }
              />
            </label>
            <label>
              Duración
              <select
                value={form.durationMinutes}
                onChange={(event) =>
                  setForm({ ...form, durationMinutes: event.target.value })
                }
              >
                {[
                  [30, "30 minutos"],
                  [60, "1 hora"],
                  [90, "1 hora y media"],
                  [120, "2 horas"],
                  [180, "3 horas"],
                ].map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="notas-calendario">
              Notas opcionales
              <textarea
                maxLength="500"
                value={form.notes}
                onChange={(event) =>
                  setForm({ ...form, notes: event.target.value })
                }
                placeholder="Qué quieres repasar o preparar"
              />
            </label>
            <div className="pie-formulario-calendario">
              <p className="mensaje exito">{message}</p>
              <div>
                {editingId && (
                  <button
                    className="secundario"
                    type="button"
                    onClick={() => {
                      setEditingId("");
                      setForm(emptyForm);
                    }}
                  >
                    Cancelar
                  </button>
                )}
                <button className="principal" type="submit" disabled={saving}>
                  {saving
                    ? "Guardando…"
                    : editingId
                      ? "Guardar cambios"
                      : "Guardar sesión"}
                </button>
              </div>
            </div>
          </form>
        </section>
        <section className="tarjeta tarjeta-semana">
          <div className="encabezado-calendario">
            <h2>Esta semana</h2>
            <span>
              {formatearFecha(firstDay, { day: "numeric", month: "short" })} –{" "}
              {formatearFecha(
                new Date(
                  firstDay.getFullYear(),
                  firstDay.getMonth(),
                  firstDay.getDate() + 6,
                ),
                { day: "numeric", month: "short" },
              )}
            </span>
          </div>
          <div className="cuadricula-calendario">
            {Array.from({ length: 7 }, (_, index) => {
              const day = new Date(firstDay);
              day.setDate(day.getDate() + index);
              const daySessions = sessions.filter(
                (session) =>
                  new Date(session.startsAt).toDateString() ===
                  day.toDateString(),
              );
              return (
                <article
                  className={`dia ${daySessions.length ? "activo" : ""}`}
                  key={day.toISOString()}
                >
                  <strong>{formatearFecha(day, { weekday: "short" })}</strong>
                  <span>{day.getDate()}</span>
                  {daySessions.map((session) => (
                    <small className="sesion" key={session.id}>
                      {formatearFecha(session.startsAt, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · {session.subject}
                    </small>
                  ))}
                </article>
              );
            })}
          </div>
        </section>
        <section className="tarjeta" style={{ marginTop: 18 }}>
          <h2>Próximas sesiones</h2>
          <p className="mensaje">
            {upcoming.length
              ? `${upcoming.length} sesión(es) programada(s).`
              : "Aún no tienes sesiones programadas."}
          </p>
          <div className="sesiones-proximas">
            {upcoming.map((session) => (
              <article className="sesion-proxima" key={session.id}>
                <div>
                  <strong>{session.subject}</strong>
                  <span>
                    {formatearFecha(session.startsAt, {
                      dateStyle: "full",
                      timeStyle: "short",
                    })}{" "}
                    · {session.durationMinutes} min
                  </span>
                  {session.notes && <p>{session.notes}</p>}
                </div>
                <div>
                  <button type="button" onClick={() => editarSesion(session)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => eliminarSesion(session.id)}
                  >
                    Eliminar
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
