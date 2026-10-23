const express = require("express");
const User = require("../models/User");
const { requireAuth } = require("./auth");
const { safeUser } = require("../utils/safe-user");

const router = express.Router();

router.get("/me", requireAuth, async (request, response, next) => {
  try {
    const user = await User.findById(request.auth.userId);
    if (!user)
      return response.status(404).json({ error: "No encontramos tu cuenta." });
    response.json({ user: safeUser(user) });
  } catch (error) {
    next(error);
  }
});

router.patch("/me", requireAuth, async (request, response, next) => {
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
      user: safeUser(user),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/matches", requireAuth, async (request, response, next) => {
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
    response.json({ users: users.map(safeUser) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
