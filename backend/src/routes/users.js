const express = require("express");
const User = require("../models/User");
const AdminNotification = require("../models/AdminNotification");
const { exigirSesion } = require("./auth");
const { usuarioSeguro } = require("../utils/safe-user");

const router = express.Router();

router.get("/me", exigirSesion, async (request, response, next) => {
  try {
    const user = await User.findById(request.auth.userId);
    if (!user)
      return response.status(404).json({ error: "No encontramos tu cuenta." });
    response.json({ user: usuarioSeguro(user) });
  } catch (error) {
    next(error);
  }
});

router.patch("/me", exigirSesion, async (request, response, next) => {
  try {
    const allowedFields = [
      "fullName",
      "country",
      "university",
      "career",
      "subjects",
      "availability",
      "studyPreference",
    ];
    const updates = {};
    for (const field of allowedFields) {
      if (request.body[field] !== undefined)
        updates[field] = request.body[field];
    }
    if (updates.fullName !== undefined)
      updates.fullName = String(updates.fullName).trim();
    if (updates.subjects !== undefined)
      updates.subjects = Array.isArray(updates.subjects)
        ? updates.subjects
            .map(String)
            .map((item) => item.trim())
            .filter(Boolean)
        : [];

    const user = await User.findByIdAndUpdate(request.auth.userId, updates, {
      new: true,
      runValidators: true,
    });
    if (!user)
      return response.status(404).json({ error: "No encontramos tu cuenta." });
    response.json({
      message: "Perfil actualizado correctamente.",
      user: usuarioSeguro(user),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/matches", exigirSesion, async (request, response, next) => {
  try {
    const users = await User.find({
      _id: { $ne: request.auth.userId },
      role: "user",
      accountStatus: "active",
    })
      .select(
        "fullName university career subjects availability studyPreference country",
      )
      .limit(100);
    response.json({ users: users.map(usuarioSeguro) });
  } catch (error) {
    next(error);
  }
});

router.get(
  "/me/notifications",
  exigirSesion,
  async (request, response, next) => {
    try {
      const notifications = await AdminNotification.find({
        recipient: request.auth.userId,
      })
        .sort({ createdAt: -1 })
        .limit(100);
      response.json({
        notifications: notifications.map((notification) => ({
          id: notification._id,
          content: notification.content,
          readAt: notification.readAt,
          createdAt: notification.createdAt,
        })),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/me/notifications/read",
  exigirSesion,
  async (request, response, next) => {
    try {
      await AdminNotification.updateMany(
        { recipient: request.auth.userId, readAt: null },
        { readAt: new Date() },
      );
      response.json({ message: "Notificaciones marcadas como leídas." });
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;
