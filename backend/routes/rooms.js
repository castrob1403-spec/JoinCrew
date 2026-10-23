const express = require("express");
const StudyRoom = require("../models/StudyRoom");
const User = require("../models/User");
const { requireAuth } = require("./auth");

const router = express.Router();
router.use(requireAuth);

function currentUserId(request) {
  return String(request.auth.userId);
}

function safeRoom(room) {
  return {
    id: room._id,
    name: room.name,
    description: room.description,
    maxParticipants: room.maxParticipants,
    createdBy: room.createdBy?._id || room.createdBy,
    group: room.group?._id || room.group || null,
    isPublic: room.isPublic,
    status: room.status,
    createdAt: room.createdAt,
    endedAt: room.endedAt,
  };
}

router.get("/", async (_request, response, next) => {
  try {
    const rooms = await StudyRoom.find({ isPublic: true, status: "live" })
      .sort({ createdAt: -1 })
      .limit(100);
    response.json({ rooms: rooms.map(safeRoom) });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (request, response, next) => {
  try {
    const name = String(request.body.name || "").trim();
    const maxParticipants = Number(request.body.maxParticipants);
    const user = await User.findById(currentUserId(request)).select("plan");
    if (!name || !Number.isInteger(maxParticipants))
      return response
        .status(400)
        .json({ error: "Completa el nombre y la capacidad de la sala." });
    if (maxParticipants < 2 || maxParticipants > 999)
      return response
        .status(400)
        .json({ error: "La sala debe tener entre 2 y 999 participantes." });
    if (user?.plan !== "premium" && maxParticipants > 5)
      return response
        .status(403)
        .json({ error: "Las salas Free admiten hasta 5 participantes." });
    const room = await StudyRoom.create({
      name,
      description: String(request.body.description || "").trim(),
      maxParticipants,
      createdBy: currentUserId(request),
      isPublic: true,
    });
    response.status(201).json({ room: safeRoom(room) });
  } catch (error) {
    next(error);
  }
});

router.get("/:roomId", async (request, response, next) => {
  try {
    const room = await StudyRoom.findById(request.params.roomId);
    if (!room)
      return response
        .status(404)
        .json({ error: "Esta sala no está disponible." });
    response.json({
      room: safeRoom(room),
      canEnd:
        String(room.createdBy) === currentUserId(request) &&
        room.status === "live",
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/:roomId", async (request, response, next) => {
  try {
    const room = await StudyRoom.findById(request.params.roomId);
    if (!room)
      return response
        .status(404)
        .json({ error: "Esta sala no está disponible." });
    if (String(room.createdBy) !== currentUserId(request))
      return response
        .status(403)
        .json({ error: "Solo quien creó la sala puede finalizarla." });
    room.status = "closed";
    room.endedAt = new Date();
    await room.save();
    response.json({ message: "Sala finalizada correctamente." });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
