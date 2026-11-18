const express = require("express");
const { exigirSesion } = require("./auth");
const { responderAyuda } = require("../services/ia");
const User = require("../models/User");

const router = express.Router();

async function limitarConsultasIA(request, response, next) {
  try {
    const user = await User.findById(request.auth.userId);
    if (!user || user.accountStatus === "banned") {
      return response.status(403).json({
        error: "No tienes permiso para usar el asistente.",
      });
    }

    const ahora = new Date();
    const haceUnaHora = ahora.getTime() - 60 * 60 * 1000;
    if (
      !user.inicioConsultasIA ||
      user.inicioConsultasIA.getTime() < haceUnaHora
    ) {
      user.inicioConsultasIA = ahora;
      user.consultasIA = 0;
    }

    user.consultasIA = Number(user.consultasIA || 0);

    if (user.consultasIA >= 12) {
      return response.status(429).json({
        error:
          "Alcanzaste el límite de 12 preguntas por hora. Inténtalo más tarde.",
      });
    }

    user.consultasIA += 1;
    await user.save();
    next();
  } catch (error) {
    next(error);
  }
}

router.post(
  "/ayuda",
  exigirSesion,
  limitarConsultasIA,
  async (request, response, next) => {
    try {
      const pregunta = String(request.body.pregunta || "").trim();
      const ruta = String(request.body.ruta || "").trim();

      if (!pregunta || pregunta.length > 500) {
        return response.status(400).json({
          error: "Escribe una pregunta de hasta 500 caracteres.",
        });
      }

      const respuesta = await responderAyuda({ pregunta, ruta });
      response.json({ respuesta });
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;
