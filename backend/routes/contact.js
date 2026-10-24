const express = require("express");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const ContactMessage = require("../models/ContactMessage");
const User = require("../models/User");
const { requireAuth } = require("./auth");

const router = express.Router();

function safeContact(contact) {
  return {
    id: contact._id,
    fullName: contact.fullName,
    email: contact.email,
    subject: contact.subject,
    message: contact.message,
    status: contact.status,
    adminReply: contact.adminReply,
    repliedAt: contact.repliedAt,
    createdAt: contact.createdAt,
  };
}

function optionalUserId(request) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET).userId || null;
  } catch {
    return null;
  }
}

async function requireAdmin(request, response, next) {
  requireAuth(request, response, async () => {
    try {
      const user = await User.findById(request.auth.userId).select(
        "role accountStatus",
      );
      if (!user || user.role !== "admin" || user.accountStatus === "banned") {
        return response.status(403).json({
          error: "Solo la administradora puede realizar esta acción.",
        });
      }
      request.admin = user;
      next();
    } catch (error) {
      next(error);
    }
  });
}

router.post("/", async (request, response, next) => {
  try {
    const fullName = String(request.body.fullName || "").trim();
    const email = String(request.body.email || "")
      .trim()
      .toLowerCase();
    const subject = String(request.body.subject || "").trim();
    const message = String(request.body.message || "").trim();

    if (
      fullName.length < 2 ||
      !/^\S+@\S+\.\S+$/.test(email) ||
      !subject ||
      message.length < 10
    ) {
      return response.status(400).json({
        error:
          "Completa tu nombre, correo, asunto y un mensaje de al menos 10 caracteres.",
      });
    }

    const contact = await ContactMessage.create({
      fullName,
      email,
      subject,
      message,
      user: optionalUserId(request),
    });
    response.status(201).json({
      message: "¡Mensaje recibido! El equipo de JoinCrew lo revisará pronto.",
      contact: safeContact(contact),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/", requireAdmin, async (_request, response, next) => {
  try {
    const messages = await ContactMessage.find()
      .sort({ createdAt: -1 })
      .limit(200);
    response.json({ messages: messages.map(safeContact) });
  } catch (error) {
    next(error);
  }
});

router.patch("/:contactId", requireAdmin, async (request, response, next) => {
  try {
    const reply = String(request.body.reply || "").trim();
    if (!reply || reply.length > 2000) {
      return response
        .status(400)
        .json({ error: "Escribe una respuesta de hasta 2000 caracteres." });
    }
    const contact = await ContactMessage.findById(request.params.contactId);
    if (!contact)
      return response
        .status(404)
        .json({ error: "No encontramos ese mensaje." });

    contact.adminReply = reply;
    contact.status = "read";
    await contact.save();
    response.json({ contact: safeContact(contact) });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/:contactId/send",
  requireAdmin,
  async (request, response, next) => {
    try {
      const gmailUser = process.env.GMAIL_USER;
      const gmailPassword = process.env.GMAIL_APP_PASSWORD;
      if (!gmailUser || !gmailPassword) {
        return response.status(503).json({
          error: "El correo de JoinCrew todavía no está configurado.",
        });
      }

      const contact = await ContactMessage.findById(request.params.contactId);
      if (!contact)
        return response
          .status(404)
          .json({ error: "No encontramos ese mensaje." });
      if (!contact.adminReply) {
        return response.status(400).json({
          error: "Redacta y guarda una respuesta antes de enviarla.",
        });
      }

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: gmailUser, pass: gmailPassword.replace(/\s/g, "") },
      });
      await transporter.sendMail({
        from: `JoinCrew <${gmailUser}>`,
        to: contact.email,
        replyTo: gmailUser,
        subject: `Respuesta de JoinCrew: ${contact.subject}`,
        text: `Hola ${contact.fullName},\n\n${contact.adminReply}\n\nEquipo JoinCrew`,
      });

      contact.status = "resolved";
      contact.repliedAt = new Date();
      contact.repliedBy = request.admin._id;
      await contact.save();
      response.json({
        message: "Respuesta enviada por correo.",
        contact: safeContact(contact),
      });
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;
