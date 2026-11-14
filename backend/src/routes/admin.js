const express = require("express");
const AdminNotification = require("../models/AdminNotification");
const ContactMessage = require("../models/ContactMessage");
const StudyGroup = require("../models/StudyGroup");
const StudyRoom = require("../models/StudyRoom");
const User = require("../models/User");
const { exigirSesion } = require("./auth");

const router = express.Router();

async function exigirAdmin(request, response, next) {
  exigirSesion(request, response, async () => {
    try {
      const admin = await User.findById(request.auth.userId).select(
        "role accountStatus",
      );
      if (
        !admin ||
        admin.role !== "admin" ||
        admin.accountStatus === "banned"
      ) {
        return response.status(403).json({
          error: "Este panel está reservado para la administración.",
        });
      }
      request.admin = admin;
      next();
    } catch (error) {
      next(error);
    }
  });
}

function estudianteSeguro(user) {
  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    university: user.university || "",
    career: user.career || "",
    subjects: user.subjects || [],
    availability: user.availability || "",
    studyPreference: user.studyPreference || "",
    plan: user.plan || "free",
    accountStatus: user.accountStatus || "active",
    createdAt: user.createdAt,
  };
}

function avisoSeguro(notification) {
  const recipient = notification.recipient;
  return {
    id: notification._id,
    recipientId: recipient?._id || recipient,
    recipientName: recipient?.fullName || "Estudiante",
    content: notification.content,
    readAt: notification.readAt,
    createdAt: notification.createdAt,
  };
}

router.use(exigirAdmin);

router.get("/students", async (_request, response, next) => {
  try {
    const students = await User.find({ role: "user" }).sort({ createdAt: -1 });
    response.json({ students: students.map(estudianteSeguro) });
  } catch (error) {
    next(error);
  }
});

router.patch("/students/:studentId", async (request, response, next) => {
  try {
    const updates = {};
    if (["active", "banned"].includes(request.body.accountStatus)) {
      updates.accountStatus = request.body.accountStatus;
    }
    if (["free", "premium"].includes(request.body.plan)) {
      updates.plan = request.body.plan;
    }
    if (!Object.keys(updates).length) {
      return response.status(400).json({ error: "No hay cambios válidos." });
    }

    const student = await User.findOneAndUpdate(
      { _id: request.params.studentId, role: "user" },
      updates,
      { new: true, runValidators: true },
    );
    if (!student) {
      return response
        .status(404)
        .json({ error: "No encontramos al estudiante." });
    }
    response.json({ student: estudianteSeguro(student) });
  } catch (error) {
    next(error);
  }
});

router.get("/activity", async (_request, response, next) => {
  try {
    const [groups, rooms, contacts] = await Promise.all([
      StudyGroup.find().sort({ createdAt: -1 }).limit(12),
      StudyRoom.find().sort({ createdAt: -1 }).limit(12),
      ContactMessage.countDocuments(),
    ]);
    response.json({
      groups: groups.map((group) => ({
        id: group._id,
        name: group.name,
        subject: group.subject,
        modality: group.modality,
        maxMembers: group.maxMembers,
        memberCount: group.members.length,
      })),
      rooms: rooms.map((room) => ({
        id: room._id,
        name: room.name,
        status: room.status,
        isPublic: room.isPublic,
        maxParticipants: room.maxParticipants,
      })),
      contactCount: contacts,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/notifications", async (_request, response, next) => {
  try {
    const notifications = await AdminNotification.find()
      .populate("recipient", "fullName")
      .sort({ createdAt: -1 })
      .limit(100);
    response.json({ notifications: notifications.map(avisoSeguro) });
  } catch (error) {
    next(error);
  }
});

router.get(
  "/students/:studentId/notifications",
  async (request, response, next) => {
    try {
      const notifications = await AdminNotification.find({
        recipient: request.params.studentId,
      })
        .sort({ createdAt: -1 })
        .limit(100);
      response.json({ notifications: notifications.map(avisoSeguro) });
    } catch (error) {
      next(error);
    }
  },
);

router.post("/notifications", async (request, response, next) => {
  try {
    const content = String(request.body.content || "").trim();
    const recipientId = String(request.body.recipientId || "").trim();
    if (!content || content.length > 1000) {
      return response.status(400).json({
        error: "Escribe un mensaje de hasta 1000 caracteres.",
      });
    }

    const recipients = recipientId
      ? await User.find({
          _id: recipientId,
          role: "user",
          accountStatus: "active",
        }).select("_id")
      : await User.find({ role: "user", accountStatus: "active" }).select(
          "_id",
        );
    if (!recipients.length) {
      return response.status(404).json({
        error: "No hay estudiantes disponibles para recibir el mensaje.",
      });
    }

    const notifications = await AdminNotification.insertMany(
      recipients.map((recipient) => ({
        recipient: recipient._id,
        sender: request.admin._id,
        content,
      })),
    );
    response.status(201).json({ count: notifications.length });
  } catch (error) {
    next(error);
  }
});

router.delete(
  "/notifications/:notificationId",
  async (request, response, next) => {
    try {
      const notification = await AdminNotification.findByIdAndDelete(
        request.params.notificationId,
      );
      if (!notification) {
        return response
          .status(404)
          .json({ error: "No encontramos ese aviso." });
      }
      response.json({ message: "Aviso eliminado." });
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;
