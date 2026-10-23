const express = require("express");
const StudyGroup = require("../models/StudyGroup");
const GroupMessage = require("../models/GroupMessage");
const StudyRoom = require("../models/StudyRoom");
const User = require("../models/User");
const { requireAuth } = require("./auth");

const router = express.Router();
router.use(requireAuth);

function userId(request) {
  return String(request.auth.userId);
}

function isMember(group, id) {
  return group.members.some(
    (member) => String(member.user._id || member.user) === String(id),
  );
}

function isLeader(group, id) {
  return String(group.createdBy._id || group.createdBy) === String(id);
}

function publicGroup(group) {
  return {
    id: group._id,
    name: group.name,
    description: group.description,
    subject: group.subject,
    modality: group.modality,
    maxMembers: group.maxMembers,
    memberCount: group.members.length,
    createdBy: group.createdBy?._id || group.createdBy,
    createdAt: group.createdAt,
  };
}

function detailedGroup(group) {
  return {
    ...publicGroup(group),
    members: group.members.map((member) => ({
      id: member.user._id || member.user,
      fullName: member.user.fullName || "Estudiante",
      university: member.user.university || "",
      career: member.user.career || "",
      role: member.role,
      joinedAt: member.joinedAt,
    })),
  };
}

function safePrivateRoom(room) {
  return {
    id: room._id,
    name: room.name,
    description: room.description,
    maxParticipants: room.maxParticipants,
    status: room.status,
    createdAt: room.createdAt,
    group: room.group,
    isPublic: false,
  };
}

async function findGroup(groupId) {
  return StudyGroup.findById(groupId).populate(
    "members.user",
    "fullName university career",
  );
}

router.get("/", async (_request, response, next) => {
  try {
    const groups = await StudyGroup.find().sort({ createdAt: -1 }).limit(100);
    response.json({ groups: groups.map(publicGroup) });
  } catch (error) {
    next(error);
  }
});

router.get("/mine", async (request, response, next) => {
  try {
    const groups = await StudyGroup.find({
      "members.user": userId(request),
    }).sort({ updatedAt: -1 });
    response.json({ groups: groups.map(publicGroup) });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (request, response, next) => {
  try {
    const name = String(request.body.name || "").trim();
    const subject = String(request.body.subject || "").trim();
    const maxMembers = Number(request.body.maxMembers);
    const creator = await User.findById(userId(request)).select(
      "plan accountStatus",
    );

    if (!name || !subject || !Number.isInteger(maxMembers)) {
      return response.status(400).json({
        error: "Completa el nombre, la materia y la capacidad del grupo.",
      });
    }
    if (maxMembers < 2 || maxMembers > 999) {
      return response
        .status(400)
        .json({ error: "El grupo debe tener entre 2 y 999 integrantes." });
    }
    if (creator?.plan !== "premium" && maxMembers > 5) {
      return response
        .status(403)
        .json({ error: "Los grupos Free admiten hasta 5 integrantes." });
    }

    const group = await StudyGroup.create({
      name,
      subject,
      description: String(request.body.description || "").trim(),
      modality: ["En línea", "Presencial", "Ambas"].includes(
        request.body.modality,
      )
        ? request.body.modality
        : "En línea",
      maxMembers,
      createdBy: userId(request),
      members: [{ user: userId(request), role: "leader" }],
    });
    response.status(201).json({ group: publicGroup(group) });
  } catch (error) {
    next(error);
  }
});

router.get("/:groupId", async (request, response, next) => {
  try {
    const group = await findGroup(request.params.groupId);
    if (!group)
      return response
        .status(404)
        .json({ error: "Este grupo no está disponible." });
    response.json({ group: detailedGroup(group) });
  } catch (error) {
    next(error);
  }
});

router.get("/:groupId/rooms", async (request, response, next) => {
  try {
    const group = await findGroup(request.params.groupId);
    if (!group)
      return response
        .status(404)
        .json({ error: "Este grupo no está disponible." });
    if (!isMember(group, userId(request))) {
      return response
        .status(403)
        .json({ error: "Únete al grupo para ver sus salas privadas." });
    }
    const rooms = await StudyRoom.find({
      group: group._id,
      isPublic: false,
      status: "live",
    }).sort({ createdAt: -1 });
    response.json({ rooms: rooms.map(safePrivateRoom) });
  } catch (error) {
    next(error);
  }
});

router.post("/:groupId/rooms", async (request, response, next) => {
  try {
    const group = await findGroup(request.params.groupId);
    if (!group)
      return response
        .status(404)
        .json({ error: "Este grupo no está disponible." });
    if (!isLeader(group, userId(request))) {
      return response
        .status(403)
        .json({ error: "Solo el líder puede iniciar la llamada del grupo." });
    }

    const activeRoom = await StudyRoom.findOne({
      group: group._id,
      isPublic: false,
      status: "live",
    });
    if (activeRoom) return response.json({ room: safePrivateRoom(activeRoom) });

    const room = await StudyRoom.create({
      name: `Reunión privada · ${group.name}`,
      description: `Sala privada para integrantes de ${group.name}.`,
      maxParticipants: Math.max(2, group.members.length),
      createdBy: userId(request),
      group: group._id,
      isPublic: false,
    });
    response.status(201).json({ room: safePrivateRoom(room) });
  } catch (error) {
    if (error?.code === 11000) {
      const room = await StudyRoom.findOne({
        group: request.params.groupId,
        isPublic: false,
        status: "live",
      });
      if (room) return response.json({ room: safePrivateRoom(room) });
    }
    next(error);
  }
});

router.delete("/:groupId/rooms/:roomId", async (request, response, next) => {
  try {
    const group = await findGroup(request.params.groupId);
    if (!group)
      return response
        .status(404)
        .json({ error: "Este grupo no está disponible." });
    if (!isLeader(group, userId(request))) {
      return response
        .status(403)
        .json({ error: "Solo el líder puede finalizar la llamada del grupo." });
    }
    const room = await StudyRoom.findOne({
      _id: request.params.roomId,
      group: group._id,
      isPublic: false,
      status: "live",
    });
    if (!room)
      return response
        .status(404)
        .json({ error: "Esta llamada privada ya no está disponible." });

    room.status = "closed";
    room.endedAt = new Date();
    await room.save();
    response.json({ message: "Llamada privada finalizada." });
  } catch (error) {
    next(error);
  }
});

router.post("/:groupId/join", async (request, response, next) => {
  try {
    const group = await findGroup(request.params.groupId);
    if (!group)
      return response
        .status(404)
        .json({ error: "Este grupo no está disponible." });
    if (isMember(group, userId(request)))
      return response.json({
        message: "Ya perteneces a este grupo.",
        group: detailedGroup(group),
      });
    if (group.members.length >= group.maxMembers)
      return response.status(409).json({ error: "El grupo ya está completo." });

    group.members.push({ user: userId(request), role: "member" });
    await group.save();
    const updated = await findGroup(group._id);
    response.json({
      message: "Te uniste al grupo.",
      group: detailedGroup(updated),
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/:groupId/members/:memberId", async (request, response, next) => {
  try {
    const group = await findGroup(request.params.groupId);
    if (!group)
      return response
        .status(404)
        .json({ error: "Este grupo no está disponible." });
    if (!isLeader(group, userId(request)))
      return response
        .status(403)
        .json({ error: "Solo el líder puede cambiar roles." });

    const member = group.members.find(
      (item) => String(item.user._id || item.user) === request.params.memberId,
    );
    if (!member || member.role === "leader")
      return response
        .status(400)
        .json({ error: "No se puede cambiar ese rol." });
    if (!["member", "moderator"].includes(request.body.role))
      return response.status(400).json({ error: "Rol no válido." });

    member.role = request.body.role;
    await group.save();
    const updated = await findGroup(group._id);
    response.json({ group: detailedGroup(updated) });
  } catch (error) {
    next(error);
  }
});

router.delete(
  "/:groupId/members/:memberId",
  async (request, response, next) => {
    try {
      const group = await findGroup(request.params.groupId);
      if (!group)
        return response
          .status(404)
          .json({ error: "Este grupo no está disponible." });
      if (!isLeader(group, userId(request)))
        return response
          .status(403)
          .json({ error: "Solo el líder puede retirar integrantes." });
      if (request.params.memberId === userId(request))
        return response.status(400).json({
          error:
            "El líder no puede retirarse; disuelve el grupo si corresponde.",
        });

      const before = group.members.length;
      group.members = group.members.filter(
        (member) =>
          String(member.user._id || member.user) !== request.params.memberId,
      );
      if (group.members.length === before)
        return response
          .status(404)
          .json({ error: "No encontramos a ese integrante." });
      await group.save();
      const updated = await findGroup(group._id);
      response.json({ group: detailedGroup(updated) });
    } catch (error) {
      next(error);
    }
  },
);

router.delete("/:groupId", async (request, response, next) => {
  try {
    const group = await StudyGroup.findById(request.params.groupId);
    if (!group)
      return response
        .status(404)
        .json({ error: "Este grupo no está disponible." });
    if (!isLeader(group, userId(request)))
      return response
        .status(403)
        .json({ error: "Solo el líder puede disolver el grupo." });

    await GroupMessage.deleteMany({ group: group._id });
    await StudyRoom.updateMany(
      { group: group._id, status: "live" },
      { status: "closed", endedAt: new Date() },
    );
    await group.deleteOne();
    response.json({ message: "Grupo disuelto correctamente." });
  } catch (error) {
    next(error);
  }
});

router.get("/:groupId/messages", async (request, response, next) => {
  try {
    const group = await findGroup(request.params.groupId);
    if (!group)
      return response
        .status(404)
        .json({ error: "Este grupo no está disponible." });
    if (!isMember(group, userId(request)))
      return response
        .status(403)
        .json({ error: "Únete al grupo para ver su chat." });

    const messages = await GroupMessage.find({ group: group._id })
      .populate("sender", "fullName")
      .sort({ createdAt: 1 })
      .limit(500);
    response.json({
      messages: messages.map((message) => ({
        id: message._id,
        senderId: message.sender._id,
        senderName: message.sender.fullName,
        content: message.content,
        createdAt: message.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/:groupId/messages", async (request, response, next) => {
  try {
    const group = await findGroup(request.params.groupId);
    if (!group)
      return response
        .status(404)
        .json({ error: "Este grupo no está disponible." });
    if (!isMember(group, userId(request)))
      return response
        .status(403)
        .json({ error: "Únete al grupo para enviar mensajes." });

    const content = String(request.body.content || "").trim();
    if (!content)
      return response
        .status(400)
        .json({ error: "Escribe un mensaje antes de enviarlo." });
    const message = await GroupMessage.create({
      group: group._id,
      sender: userId(request),
      content,
    });
    group.updatedAt = new Date();
    await group.save();
    response.status(201).json({
      message: {
        id: message._id,
        senderId: userId(request),
        content: message.content,
        createdAt: message.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.delete(
  "/:groupId/messages/:messageId",
  async (request, response, next) => {
    try {
      const group = await findGroup(request.params.groupId);
      if (!group || !isMember(group, userId(request)))
        return response
          .status(404)
          .json({ error: "No encontramos este mensaje." });
      const message = await GroupMessage.findOne({
        _id: request.params.messageId,
        group: group._id,
      });
      if (!message)
        return response
          .status(404)
          .json({ error: "No encontramos este mensaje." });
      if (String(message.sender) !== userId(request))
        return response
          .status(403)
          .json({ error: "Solo puedes eliminar tus propios mensajes." });
      await message.deleteOne();
      response.json({ message: "Mensaje eliminado." });
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;
