import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import EncabezadoUsuario from "../components/EncabezadoUsuario";
import { useUsuario } from "../components/Usuario";
import { api } from "../services/api";
import { calcularAfinidad } from "../utilidades";

export default function Coincidencias() {
  const navigate = useNavigate();
  const { user } = useUsuario();
  const [matches, setMatches] = useState([]);
  const [message, setMessage] = useState("Buscando estudiantes compatibles…");
  useEffect(() => {
    if (!user) return;
    api
      .get("/users/matches")
      .then(({ users }) => {
        const items = (users || [])
          .map((profile) => ({
            ...profile,
            ...calcularAfinidad(user, profile),
          }))
          .sort((a, b) => b.score - a.score);
        setMatches(items);
        setMessage(
          items.length
            ? `${items.length} estudiante(s) disponible(s).`
            : "Aún no hay otros estudiantes registrados para mostrar.",
        );
      })
      .catch((error) =>
        setMessage(error.message || "No pudimos cargar las coincidencias."),
      );
  }, [user]);
  async function abrirChat(targetUserId) {
    try {
      const { conversation } = await api.post("/conversations/direct", {
        targetUserId,
      });
      navigate(`/chat?conversation=${conversation.id}`);
    } catch (error) {
      setMessage(error.message);
    }
  }
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
      <EncabezadoUsuario user={user} active="app" />
      <main className="pagina">
        <p className="etiqueta">COINCIDENCIAS REALES</p>
        <h1 className="titulo-pagina">Personas compatibles contigo</h1>
        <p className="subtitulo">
          Comparamos tus materias, disponibilidad y modalidad con estudiantes
          registrados.
        </p>
        <p className="mensaje">{message}</p>
        <section className="lista-afinidad">
          {matches.map((match, index) => (
            <article className="afinidad" key={match.id}>
              <div className={`avatar ${index % 2 ? "ambar" : ""}`}>
                {match.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="contenido-afinidad">
                <span className="puntaje">{match.score}% compatible</span>
                <h2>{match.fullName}</h2>
                <p>
                  {match.university} · {match.career}
                </p>
                <div className="etiquetas">
                  {match.sharedSubjects.map((subject) => (
                    <span key={subject}>📚 {subject}</span>
                  ))}
                  <span>◷ {match.availability}</span>
                  <span>◉ {match.studyPreference}</span>
                </div>
              </div>
              <button
                className="principal"
                type="button"
                onClick={() => abrirChat(match.id)}
              >
                Enviar mensaje
              </button>
            </article>
          ))}
        </section>
      </main>
    </>
  );
}
