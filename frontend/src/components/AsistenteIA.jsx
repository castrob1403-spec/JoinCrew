import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { api } from "../services/api";

const saludos = {
  "/app": "Estoy aquí para orientarte sobre tu espacio de estudio.",
  "/calendario": "Puedo ayudarte a organizar tus sesiones en el calendario.",
  "/chat": "Puedo explicarte cómo usar los chats de JoinCrew.",
  "/grupos": "Puedo orientarte para explorar, crear o unirte a un grupo.",
  "/grupo": "Puedo explicarte esta información del grupo.",
  "/grupo-chat": "Puedo ayudarte con el chat y la sala privada del grupo.",
  "/matches": "Puedo explicarte cómo funcionan las coincidencias.",
  "/notificaciones": "Puedo ayudarte a entender tus avisos.",
  "/perfil": "Puedo orientarte para completar tu perfil académico.",
  "/premium": "Puedo explicarte la información de los planes.",
  "/sala": "Puedo ayudarte con esta sala de estudio.",
};

function crearSaludo(ruta) {
  return saludos[ruta] || "¿Qué necesitas saber sobre JoinCrew?";
}

export default function AsistenteIA() {
  const { pathname } = useLocation();
  const [abierto, setAbierto] = useState(false);
  const [pregunta, setPregunta] = useState("");
  const [mensajes, setMensajes] = useState([
    { autor: "ia", texto: crearSaludo(pathname) },
  ]);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    setAbierto(false);
    setPregunta("");
    setMensajes([{ autor: "ia", texto: crearSaludo(pathname) }]);
  }, [pathname]);

  async function enviarPregunta(event) {
    event.preventDefault();
    const texto = pregunta.trim();
    if (!texto || enviando) return;

    setMensajes((actuales) => [...actuales, { autor: "usuario", texto }]);
    setPregunta("");
    setEnviando(true);

    try {
      const resultado = await api.post("/ia/ayuda", {
        pregunta: texto,
        ruta: pathname,
      });
      setMensajes((actuales) => [
        ...actuales,
        { autor: "ia", texto: resultado.respuesta },
      ]);
    } catch (error) {
      setMensajes((actuales) => [
        ...actuales,
        {
          autor: "ia",
          texto:
            error.message ||
            "No pude responder ahora. Inténtalo nuevamente en unos segundos.",
        },
      ]);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <aside className={`asistente-ia ${abierto ? "abierto" : ""}`}>
      {abierto && (
        <section
          className="ventana-asistente"
          id="asistente-joincrew"
          aria-label="Asistente Lumi"
        >
          <header className="encabezado-asistente">
            <div>
              <span className="avatar-lumi">
                <img src="/img/Lumi.png" alt="" />
              </span>
              <div>
                <strong>Lumi</strong>
                <small>Asistente de JoinCrew</small>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar asistente"
            >
              ×
            </button>
          </header>
          <div className="mensajes-asistente" aria-live="polite">
            {mensajes.map((mensaje, indice) => (
              <p
                className={`mensaje-asistente ${mensaje.autor}`}
                key={`${mensaje.autor}-${indice}`}
              >
                {mensaje.texto}
              </p>
            ))}
            {enviando && (
              <p className="mensaje-asistente ia">Lumi está pensando…</p>
            )}
          </div>
          <form className="formulario-asistente" onSubmit={enviarPregunta}>
            <input
              type="text"
              value={pregunta}
              onChange={(event) => setPregunta(event.target.value)}
              placeholder="Pregunta sobre JoinCrew"
              maxLength="500"
              disabled={enviando}
              required
            />
            <button type="submit" disabled={enviando}>
              Enviar
            </button>
          </form>
        </section>
      )}
      <button
        className="boton-asistente"
        type="button"
        onClick={() => setAbierto((actual) => !actual)}
        aria-expanded={abierto}
        aria-controls="asistente-joincrew"
      >
        <img src="/img/Lumi.png" alt="" />
        Lumi
      </button>
    </aside>
  );
}
