const express = require("express");
const DirectConversation = require("../models/DirectConversation");
const DirectMessage = require("../models/DirectMessage");
const User = require("../models/User");
const { requireAuth } = require("./auth");

const router = express.Router();
router.use(requireAuth);

function ownId(request) {
  return String(request.auth.userId);
}

async function getConversationForUser(conversationId, userId) {
  const conversation = await DirectConversation.findOne({
    _id: conversationId,
    participants: userId,
  });
  return conversation;
}

router.post("/direct", async (request, response, next) => {
  try {
    const targetUserId = String(request.body.targetUserId || "");
    const userId = ownId(request);
    if (!targetUserId || targetUserId === userId) {
      return response
        .status(400)
        .json({ error: "Selecciona otro estudiante para iniciar el chat." });
    }

    const target = await User.findOne({
      _id: targetUserId,
      role: "user",
      accountStatus: "active",
    });
    if (!target)
      return response
        .status(404)
        .json({ error: "Ese estudiante ya no está disponible." });

    const pairKey = [userId, targetUserId].sort().join(":");
    let conversation = await DirectConversation.findOne({ pairKey });
    if (!conversation) {
      conversation = await DirectConversation.create({
        participants: [userId, targetUserId],
        pairKey,
      });
    }
    response.status(201).json({ conversation: { id: conversation._id } });
  } catch (error) {
    next(error);
  }
});

router.get("/", async (request, response, next) => {
  try {
    const conversations = await DirectConversation.find({
      participants: ownId(request),
    })
      .populate("participants", "fullName university career")
      .sort({ updatedAt: -1 });

    response.json({
      conversations: conversations.map((conversation) => ({
        id: conversation._id,
        participants: conversation.participants.map((user) => ({
          id: user._id,
          fullName: user.fullName,
          university: user.university,
          career: user.career,
        })),
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:conversationId/messages", async (request, response, next) => {
  try {
    const conversation = await getConversationForUser(
      request.params.conversationId,
      ownId(request),
    );
    if (!conversation)
      return response
        .status(404)
        .json({ error: "No tienes acceso a esta conversación." });

    const messages = await DirectMessage.find({
      conversation: conversation._id,
    })
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

router.post("/:conversationId/messages", async (request, response, next) => {
  try {
    const conversation = await getConversationForUser(
      request.params.conversationId,
      ownId(request),
    );
    if (!conversation)
      return response
        .status(404)
        .json({ error: "No tienes acceso a esta conversación." });

    const content = String(request.body.content || "").trim();
    if (!content)
      return response
        .status(400)
        .json({ error: "Escribe un mensaje antes de enviarlo." });
    if (content.length > 1000)
      return response
        .status(400)
        .json({ error: "El mensaje puede tener hasta 1000 caracteres." });

    const message = await DirectMessage.create({
      conversation: conversation._id,
      sender: ownId(request),
      content,
    });
    conversation.updatedAt = new Date();
    await conversation.save();

    response.status(201).json({
      message: {
        id: message._id,
        senderId: ownId(request),
        content: message.content,
        createdAt: message.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
