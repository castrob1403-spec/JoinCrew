const crypto = require("node:crypto");
const express = require("express");
const StudyGroup = require("../models/StudyGroup");
const StudyRoom = require("../models/StudyRoom");
const User = require("../models/User");
const { requireAuth } = require("./auth");

const router = express.Router();

function base64Url(value) {
  return Buffer.from(typeof value === "string" ? value : JSON.stringify(value))
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signJwt(header, payload, privateKey) {
  const unsignedToken = `${base64Url(header)}.${base64Url(payload)}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();
  return `${unsignedToken}.${signer.sign(privateKey, "base64url")}`;
}

function normalizePrivateKey(value) {
  const input = value?.replace(/\\n/g, "\n").replace(/\r/g, "").trim();
  const match = input?.match(
    /-----BEGIN ([A-Z ]*PRIVATE KEY)-----([\s\S]*?)-----END \1-----/,
  );
  if (!match)
    throw new Error("La clave privada de JaaS no tiene un formato válido.");
  const body = match[2].replace(/\s/g, "");
  const lines = body.match(/.{1,64}/g)?.join("\n");
  return `-----BEGIN ${match[1]}-----\n${lines}\n-----END ${match[1]}-----`;
}

router.post("/token", requireAuth, async (request, response, next) => {
  try {
    const roomId = String(request.body.roomId || "");
    const appId = process.env.JAAS_APP_ID;
    const keyId = process.env.JAAS_KEY_ID;

    if (!roomId)
      return response
        .status(400)
        .json({ error: "Selecciona una sala válida." });
    if (!appId || !keyId || !process.env.JAAS_PRIVATE_KEY) {
      return response
        .status(503)
        .json({ error: "La videollamada aún no está configurada." });
    }
    let privateKey;
    try {
      privateKey = normalizePrivateKey(process.env.JAAS_PRIVATE_KEY);
    } catch (error) {
      error.statusCode = 503;
      throw error;
    }

    const [user, room] = await Promise.all([
      User.findById(request.auth.userId).select("fullName accountStatus"),
      StudyRoom.findById(roomId),
    ]);
    if (!user || user.accountStatus === "banned") {
      return response
        .status(403)
        .json({ error: "Tu cuenta no tiene acceso a esta sala." });
    }
    if (!room || room.status !== "live") {
      return response
        .status(404)
        .json({ error: "Esta sala ya no está disponible." });
    }

    let isModerator = String(room.createdBy) === String(user._id);
    if (!room.isPublic) {
      const group = await StudyGroup.findById(room.group).select("members");
      const membership = group?.members.find(
        (member) => String(member.user) === String(user._id),
      );
      if (!membership) {
        return response
          .status(403)
          .json({ error: "Esta es una sala privada del grupo." });
      }
      isModerator ||= membership.role === "leader";
    }

    const now = Math.floor(Date.now() / 1000);
    const roomName = `JoinCrew_room_${room._id}`;
    const token = signJwt(
      { alg: "RS256", kid: keyId, typ: "JWT" },
      {
        aud: "jitsi",
        iss: "chat",
        sub: appId,
        room: roomName,
        nbf: now - 10,
        exp: now + 60 * 60,
        context: {
          user: {
            id: user._id.toString(),
            name: user.fullName || "Estudiante",
            moderator: String(isModerator),
          },
          features: {
            livestreaming: false,
            recording: false,
            transcription: false,
            "outbound-call": false,
          },
          room: { regex: false },
        },
      },
      privateKey,
    );

    response.json({
      token,
      appId,
      roomName,
      callType: "video",
      canEndRoom: String(room.createdBy) === String(user._id),
      displayName: user.fullName || "Estudiante",
      groupId: room.group || null,
      isPublic: room.isPublic,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
