import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useUsuario } from "../components/Usuario";
import { api, limpiarSesion } from "../services/api";
import { calcularAfinidad } from "../utilidades";

export default function Panel() {
  const navigate = useNavigate();
  const { user } = useUsuario();
  const [matches, setMatches] = useState([]);
  const [groups, setGroups] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [message, setMessage] = useState("Cargando…");

  useEffect(() => {
    if (!user) return;
    async function cargarPanel() {
      try {
        const [matchResult, groupResult, roomResult] = await Promise.all([
          api.get("/users/matches"),
          api.get("/groups"),
          api.get("/rooms"),
        ]);
        setMatches(
          (matchResult.users || [])
            .map((match) => ({
              ...match,
              ...calcularAfinidad(user, match),
            }))
            .sort((first, second) => second.score - first.score)
            .slice(0, 2),
        );
        setGroups((groupResult.groups || []).slice(0, 2));
        setRooms((roomResult.rooms || []).slice(0, 2));
        setMessage("");
      } catch (error) {
        setMessage(error.message || "No se pudieron cargar los datos.");
      }
    }
    cargarPanel();
  }, [user]);

  function cerrarSesion() {
    limpiarSesion();
    navigate("/login");
  }

  if (!user)
    return (
      <>
        <main className="diseno-app">
          <p>{message}</p>
        </main>
      </>
    );

  return (
    <>
      <header className="encabezado-app">
        <Link className="marca" to="/">
          <img src="/img/LOGOJC2.png" alt="JoinCrew" />
        </Link>
        <nav aria-label="Navegación principal">
          <Link className="activo" to="/app">
            Explorar
          </Link>
          <Link to="/grupos">Grupos</Link>
          <Link to="/chat">Chat</Link>
          <Link to="/calendario">Calendario</Link>
        </nav>
        <div className="usuario-encabezado">
          <span>{user.fullName || "Mi perfil"}</span>
          <Link
            className="campana-avisos"
            to="/notificaciones"
            aria-label="Abrir notificaciones"
          >
            🔔
          </Link>
          <button type="button" onClick={cerrarSesion}>
            Cerrar sesión
          </button>
        </div>
      </header>
      <main className="diseno-app">
        <aside className="panel-perfil">
          <div className="avatar">
            {(user.fullName || "E").charAt(0).toUpperCase()}
          </div>
          <h2>{user.fullName || "Tu perfil"}</h2>
          <p>{user.career || "Completa tus datos académicos"}</p>
          <div className="datos-perfil">
            <p>
              <span>⌂</span>
              <span>{user.university || "JoinCrew"}</span>
            </p>
            <p>
              <span>◷</span>
              <span>{user.availability || "Disponibilidad pendiente"}</span>
            </p>
            <p>
              <span>◉</span>
              <span>{user.studyPreference || "Modalidad pendiente"}</span>
            </p>
          </div>
          <Link className="boton-contorno" to="/perfil">
            Editar perfil
          </Link>
          <div className="caja-premium">
            <span>JOINCREW PREMIUM</span>
            <strong>Estudia con más enfoque.</strong>
            <p>Planificador, filtros avanzados y estadísticas.</p>
            <Link to="/premium" className="boton-texto">
              Conocer Premium →
            </Link>
          </div>
        </aside>
        <section className="contenido">
          <section className="bienvenida">
            <div>
              <p className="etiqueta">TU ESPACIO DE ESTUDIO</p>
              <h1>
                Hola,{" "}
                <span>{user.fullName?.split(" ")[0] || "estudiante"}</span> 👋
              </h1>
              <p>
                Encuentra a las personas con las que realmente quieres estudiar.
              </p>
            </div>
          </section>
          <section className="seccion-filtro student-info-section">
            <div className="encabezado-seccion">
              <div>
                <p className="etiqueta">TU PERFIL ACADÉMICO</p>
                <h2>Información de estudiante</h2>
              </div>
              <Link className="boton-principal" to="/perfil">
                Editar información
              </Link>
            </div>
            <div className="cuadricula-info-estudiante">
              <article>
                <span>País</span>
                <strong>{user.country || "Sin especificar"}</strong>
              </article>
              <article>
                <span>Universidad o institución</span>
                <strong>{user.university || "Sin especificar"}</strong>
              </article>
              <article>
                <span>Carrera</span>
                <strong>{user.career || "Sin especificar"}</strong>
              </article>
              <article>
                <span>Disponibilidad</span>
                <strong>{user.availability || "Sin especificar"}</strong>
              </article>
              <article className="materias-estudiante">
                <span>Materias e intereses</span>
                <div className="etiquetas">
                  {(user.subjects || []).map((subject) => (
                    <span key={subject}>📚 {subject}</span>
                  ))}
                </div>
              </article>
            </div>
          </section>
          <section className="seccion-afinidad">
            <div className="encabezado-seccion compacto">
              <div>
                <p className="etiqueta">COINCIDENCIAS PARA TI</p>
                <h2>Tu próximo match está aquí</h2>
              </div>
              <span className="total-resultados">
                {matches.length
                  ? `${matches.length} coincidencia${matches.length === 1 ? "" : "s"}`
                  : "Sin coincidencias aún"}
              </span>
            </div>
            <div className="cuadricula-afinidad">
              {matches.length ? (
                matches.map((match, index) => (
                  <article
                    className={`tarjeta-afinidad ${index === 0 ? "destacado" : ""}`}
                    key={match.id}
                  >
                    <div className="superior-afinidad">
                      <span
                        className={`puntaje-afinidad ${index === 1 ? "suave" : ""}`}
                      >
                        {match.score}% compatible
                      </span>
                    </div>
                    <div className="persona">
                      <div
                        className={`avatar-persona ${index === 1 ? "ambar" : "violeta"}`}
                      >
                        {match.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3>{match.fullName}</h3>
                        <p>
                          {match.university} · {match.career}
                        </p>
                      </div>
                    </div>
                    <div className="etiquetas">
                      {match.sharedSubjects.map((subject) => (
                        <span key={subject}>📚 {subject}</span>
                      ))}
                      <span>🕐 {match.availability}</span>
                      <span>🌐 {match.studyPreference}</span>
                    </div>
                    <p className="descripcion-afinidad">
                      Coincide contigo por sus intereses académicos y
                      preferencias de estudio.
                    </p>
                    <Link
                      className={
                        index === 0
                          ? "primary-button study-button"
                          : "outline-button study-button"
                      }
                      to="/matches"
                    >
                      Ver coincidencias
                    </Link>
                  </article>
                ))
              ) : (
                <p className="vista-afinidad-vacia">
                  Aún no hay otros estudiantes registrados. Invita a tus
                  compañeros a unirse a JoinCrew.
                </p>
              )}
            </div>
            <Link to="/matches" className="boton-texto enlace-mas-afinidad">
              Ver más coincidencias →
            </Link>
          </section>
          <VistaPrevia
            title="Grupos activos en JoinCrew"
            eyebrow="GRUPOS"
            items={groups}
            emptyText="Aún no hay grupos disponibles."
            link="/grupos"
            linkText="Ver todos →"
            type="group"
          />
          <VistaPrevia
            title="Únete a una sesión en curso"
            eyebrow="SALAS EN VIVO"
            items={rooms}
            emptyText="No hay salas públicas en vivo."
            link="/grupos#salas"
            linkText="Explorar salas →"
            type="room"
          />
          {message && <p className="estado-vista">{message}</p>}
          <section className="cuadricula-herramientas">
            <article className="tarjeta-herramienta">
              <span>💬</span>
              <div>
                <h3>Chat de estudio</h3>
                <p>Conversa con tu grupo y resuelve dudas.</p>
              </div>
              <Link to="/chat">Abrir chat</Link>
            </article>
            <article className="tarjeta-herramienta">
              <span>🗓️</span>
              <div>
                <h3>Tu calendario</h3>
                <p>Organiza tu próxima sesión de estudio.</p>
              </div>
              <Link to="/calendario">Ver calendario</Link>
            </article>
            <article className="tarjeta-herramienta herramienta-premium">
              <span>✦</span>
              <div>
                <h3>Estadísticas Premium</h3>
                <p>Conoce tus hábitos y progreso de estudio.</p>
              </div>
              <Link to="/premium">Ver planes</Link>
            </article>
          </section>
        </section>
      </main>
    </>
  );
}

function VistaPrevia({
  title,
  eyebrow,
  items,
  emptyText,
  link,
  linkText,
  type,
}) {
  return (
    <section className="seccion-grupos seccion-vista-salas">
      <div className="encabezado-seccion compacto">
        <div>
          <p className="etiqueta">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <Link className="boton-texto" to={link}>
          {linkText}
        </Link>
      </div>
      <p className="estado-vista">
        {items.length
          ? `${items.length} ${type === "room" ? "sala(s) pública(s) en vivo." : "grupo(s) disponible(s)."}`
          : emptyText}
      </p>
      <div className="cuadricula-grupos">
        {items.map((item) => (
          <article className="tarjeta-grupo" key={item.id}>
            <span className={`icono-grupo ${type === "grupo" ? "azul" : ""}`}>
              {type === "room" ? "🎥" : "👥"}
            </span>
            <div>
              {type === "room" ? (
                <>
                  <small className="etiqueta-oficial etiqueta-vivo">
                    EN VIVO
                  </small>
                  <h3>{item.name}</h3>
                  <p>{item.description || "Sala pública de estudio"}</p>
                  <small>Hasta {item.maxParticipants} participantes</small>
                </>
              ) : (
                <>
                  <small>
                    {item.memberCount}/{item.maxMembers} integrantes
                  </small>
                  <h3>{item.name}</h3>
                  <p>
                    {item.subject} · {item.modality}
                  </p>
                  <small>{item.description || "Sin descripción"}</small>
                </>
              )}
            </div>
            <Link
              className="boton-contorno"
              to={
                type === "room"
                  ? `/sala?room=${item.id}`
                  : `/grupo?id=${item.id}`
              }
            >
              {type === "room" ? "Unirse" : "Ver grupo"}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
