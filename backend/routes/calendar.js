const express = require("express");
const StudySession = require("../models/StudySession");
const { requireAuth } = require("./auth");

const router = express.Router();
router.use(requireAuth);

function safeSession(session) {
  return {
    id: session._id,
    subject: session.subject,
    startsAt: session.startsAt,
    durationMinutes: session.durationMinutes,
    notes: session.notes,
    createdAt: session.createdAt,
  };
}

router.get("/", async (request, response, next) => {
  try {
    const sessions = await StudySession.find({
      owner: request.auth.userId,
    })
      .sort({ startsAt: 1 })
      .limit(200);
    response.json({ sessions: sessions.map(safeSession) });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (request, response, next) => {
  try {
    const subject = String(request.body.subject || "").trim();
    const startsAt = new Date(request.body.startsAt);
    const durationMinutes = Number(request.body.durationMinutes);
    const notes = String(request.body.notes || "").trim();

    if (!subject || subject.length > 100) {
      return response
        .status(400)
        .json({ error: "Ingresa una materia de hasta 100 caracteres." });
    }
    if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) {
      return response.status(400).json({
        error: "Elige una fecha y hora futura para la sesión.",
      });
    }
    if (
      !Number.isInteger(durationMinutes) ||
      durationMinutes < 15 ||
      durationMinutes > 480
    ) {
      return response.status(400).json({
        error: "La duración debe estar entre 15 minutos y 8 horas.",
      });
    }
    if (notes.length > 500) {
      return response
        .status(400)
        .json({ error: "Las notas pueden tener hasta 500 caracteres." });
    }

    const session = await StudySession.create({
      owner: request.auth.userId,
      subject,
      startsAt,
      durationMinutes,
      notes,
    });
    response.status(201).json({ session: safeSession(session) });
  } catch (error) {
    next(error);
  }
});

router.patch("/:sessionId", async (request, response, next) => {
  try {
    const subject = String(request.body.subject || "").trim();
    const startsAt = new Date(request.body.startsAt);
    const durationMinutes = Number(request.body.durationMinutes);
    const notes = String(request.body.notes || "").trim();

    if (!subject || subject.length > 100) {
      return response
        .status(400)
        .json({ error: "Ingresa una materia de hasta 100 caracteres." });
    }
    if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) {
      return response.status(400).json({
        error: "Elige una fecha y hora futura para la sesión.",
      });
    }
    if (
      !Number.isInteger(durationMinutes) ||
      durationMinutes < 15 ||
      durationMinutes > 480
    ) {
      return response.status(400).json({
        error: "La duración debe estar entre 15 minutos y 8 horas.",
      });
    }
    if (notes.length > 500) {
      return response
        .status(400)
        .json({ error: "Las notas pueden tener hasta 500 caracteres." });
    }

    const session = await StudySession.findOneAndUpdate(
      { _id: request.params.sessionId, owner: request.auth.userId },
      { subject, startsAt, durationMinutes, notes },
      { new: true, runValidators: true },
    );
    if (!session) {
      return response
        .status(404)
        .json({ error: "No encontramos esa sesión de estudio." });
    }
    response.json({ session: safeSession(session) });
  } catch (error) {
    next(error);
  }
});

router.delete("/:sessionId", async (request, response, next) => {
  try {
    const session = await StudySession.findOneAndDelete({
      _id: request.params.sessionId,
      owner: request.auth.userId,
    });
    if (!session) {
      return response
        .status(404)
        .json({ error: "No encontramos esa sesión de estudio." });
    }
    response.json({ message: "Sesión eliminada." });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
