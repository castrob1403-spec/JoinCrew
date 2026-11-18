const OpenAI = require("openai");

const secciones = {
  "/app": "Panel principal: perfil, coincidencias, grupos y salas públicas.",
  "/calendario": "Calendario: crear, editar o eliminar sesiones personales.",
  "/chat": "Chat: conversaciones privadas con otros estudiantes.",
  "/grupos": "Grupos: explorar, crear o unirse a grupos de estudio.",
  "/grupo": "Información de un grupo y sus integrantes.",
  "/grupo-chat": "Chat de grupo y sala privada de llamada del grupo.",
  "/matches": "Coincidencias: estudiantes compatibles según sus perfiles.",
  "/notificaciones": "Notificaciones enviadas por la administración.",
  "/perfil": "Perfil: editar información académica y preferencias.",
  "/premium": "Premium: información demostrativa de los planes de JoinCrew.",
  "/sala": "Sala: reunión de estudio activa dentro de JoinCrew.",
};

function clienteIA() {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error("La IA de JoinCrew todavía no está configurada.");
    error.statusCode = 503;
    throw error;
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function modeloIA() {
  return process.env.OPENAI_MODEL || "gpt-6-luna";
}

async function textoMarcado(texto) {
  const cliente = clienteIA();
  const respuesta = await cliente.moderations.create({
    model: "omni-moderation-latest",
    input: texto,
  });

  return respuesta.results.some((resultado) => resultado.flagged);
}

async function revisarRegistro({ nombre, universidad, materias }) {
  if (await textoMarcado(nombre)) {
    return {
      aceptar: false,
      mensaje: "El nombre contiene texto que no podemos aceptar.",
    };
  }

  const texto = `Institución: ${universidad}\nMaterias: ${materias.join(", ")}`;

  if (await textoMarcado(texto)) {
    return {
      aceptar: false,
      mensaje: "Revisa la universidad y las materias antes de continuar.",
    };
  }

  const cliente = clienteIA();
  const respuesta = await cliente.responses.create({
    model: modeloIA(),
    instructions:
      "Eres un filtro adicional para el registro de JoinCrew, una plataforma de estudio. Evalúa si la institución y las materias parecen datos serios de un perfil académico. Rechaza contenido ofensivo, spam, texto sin sentido, instituciones que parezcan ficticias y materias que no tengan una relación académica reconocible. No intentes confirmar la identidad real de la persona ni rechaces una materia poco común si se expresa de forma seria. Decide por el contexto general, no por una lista fija de palabras. Devuelve únicamente el JSON solicitado.",
    input: texto,
    max_output_tokens: 120,
    text: {
      format: {
        type: "json_schema",
        name: "revision_registro",
        strict: true,
        schema: {
          type: "object",
          properties: {
            aceptar: { type: "boolean" },
            mensaje: { type: "string" },
          },
          required: ["aceptar", "mensaje"],
          additionalProperties: false,
        },
      },
    },
  });

  const revision = JSON.parse(respuesta.output_text);
  return {
    aceptar: Boolean(revision.aceptar),
    mensaje: String(revision.mensaje || "Revisa los datos ingresados."),
  };
}

async function responderAyuda({ pregunta, ruta }) {
  if (await textoMarcado(pregunta)) {
    return "No puedo ayudar con ese contenido. Si necesitas soporte sobre JoinCrew, usa preguntas relacionadas con la plataforma.";
  }

  const contexto = secciones[ruta] || "Sección general de JoinCrew.";
  const cliente = clienteIA();
  const respuesta = await cliente.responses.create({
    model: modeloIA(),
    instructions:
      "Eres Lumi, la asistente de ayuda de JoinCrew. Responde en español, de forma amable y breve, con un máximo de 90 palabras. Explica únicamente funciones existentes de JoinCrew: perfil, coincidencias, grupos, chats, calendario, salas y notificaciones. Usa el contexto de la sección actual. No inventes funciones, no des instrucciones para obtener datos privados y nunca pidas contraseñas, códigos de verificación, claves ni información de pago. Si la pregunta no trata sobre JoinCrew, indica amablemente que puedes orientar sobre la plataforma.",
    input: `Sección actual: ${contexto}\nPregunta: ${pregunta}`,
    max_output_tokens: 220,
  });

  return respuesta.output_text.trim();
}

module.exports = { revisarRegistro, responderAyuda };
