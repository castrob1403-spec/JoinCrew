const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const User = require("../models/User");
const { usuarioSeguro } = require("../utils/safe-user");
const { revisarRegistro } = require("../services/ia");

const router = express.Router();

const AVAILABLE_CAREERS = new Set([
  "Administración de Empresas",
  "Arquitectura",
  "Biología",
  "Comunicación",
  "Contabilidad y Auditoría",
  "Derecho",
  "Diseño Gráfico",
  "Economía",
  "Educación",
  "Enfermería",
  "Ingeniería Ambiental",
  "Ingeniería Civil",
  "Ingeniería de Software",
  "Ingeniería en Sistemas",
  "Ingeniería Industrial",
  "Medicina",
  "Nutrición",
  "Odontología",
  "Psicología",
  "Relaciones Internacionales",
  "Trabajo Social",
  "Turismo",
]);

function nombreValido(value) {
  return /^[\p{L}][\p{L}' -]{1,98}$/u.test(value);
}

function gmailValido(value) {
  const match = value.match(/^([a-z0-9.]{6,30})@gmail\.com$/i);
  if (!match) return false;
  const username = match[1];
  return (
    !username.startsWith(".") &&
    !username.endsWith(".") &&
    !username.includes("..")
  );
}

function claveValida(value) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(value);
}

function crearCodigo() {
  return crypto.randomInt(100000, 1000000).toString();
}

function hashCodigo(code) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

async function enviarCorreoVerificacion(user) {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPassword = process.env.GMAIL_APP_PASSWORD;
  if (!gmailUser || !gmailPassword) {
    throw new Error("El correo de verificación todavía no está configurado.");
  }
  if (
    user.verificationLastSentAt &&
    Date.now() - user.verificationLastSentAt.getTime() < 60 * 1000
  ) {
    const error = new Error("Espera un minuto antes de pedir otro código.");
    error.statusCode = 429;
    throw error;
  }

  const code = crearCodigo();
  user.verificationCodeHash = hashCodigo(code);
  user.verificationExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
  user.verificationLastSentAt = new Date();
  user.verificationAttempts = 0;
  await user.save();

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailUser, pass: gmailPassword.replace(/\s/g, "") },
  });
  await transporter.sendMail({
    from: `JoinCrew <${gmailUser}>`,
    to: user.email,
    subject: "Confirma tu correo de JoinCrew",
    text: `Hola ${user.fullName},\n\nTu código de verificación es: ${code}\n\nVence en 15 minutos. Si no creaste esta cuenta, ignora este mensaje.`,
  });
}

function crearToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );
}

function exigirSesion(request, response, next) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token)
    return response
      .status(401)
      .json({ error: "Inicia sesión para continuar." });

  try {
    request.auth = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    response
      .status(401)
      .json({ error: "Tu sesión ya no es válida. Inicia sesión nuevamente." });
  }
}

router.post("/register", async (request, response, next) => {
  try {
    const {
      fullName,
      email,
      password,
      country,
      university,
      career,
      subjects,
      availability,
      studyPreference,
    } = request.body;
    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();
    const normalizedName = String(fullName || "").trim();
    const normalizedUniversity = String(university || "").trim();
    const normalizedCareer = String(career || "").trim();
    const normalizedSubjects = Array.isArray(subjects)
      ? subjects.map((subject) => String(subject).trim()).filter(Boolean)
      : [];

    if (!nombreValido(normalizedName)) {
      return response
        .status(400)
        .json({ error: "Ingresa un nombre de usuario válido." });
    }
    if (!gmailValido(normalizedEmail)) {
      return response
        .status(400)
        .json({ error: "Regístrate con un correo de Gmail válido." });
    }
    if (!claveValida(String(password || ""))) {
      return response.status(400).json({
        error:
          "La contraseña debe tener 8 caracteres e incluir mayúscula, minúscula y número.",
      });
    }
    if (normalizedUniversity.length < 3 || normalizedUniversity.length > 120) {
      return response.status(400).json({
        error: "Ingresa una universidad o institución válida.",
      });
    }
    if (!AVAILABLE_CAREERS.has(normalizedCareer)) {
      return response.status(400).json({
        error: "Selecciona una carrera de la lista disponible.",
      });
    }
    if (normalizedSubjects.length < 1 || normalizedSubjects.length > 6) {
      return response.status(400).json({
        error: "Ingresa entre 1 y 6 materias para tu perfil.",
      });
    }
    if (await User.exists({ email: normalizedEmail })) {
      return response
        .status(409)
        .json({ error: "Ya existe una cuenta con ese correo." });
    }

    try {
      const revision = await revisarRegistro({
        nombre: normalizedName,
        universidad: normalizedUniversity,
        materias: normalizedSubjects,
      });
      if (!revision.aceptar) {
        return response.status(400).json({ error: revision.mensaje });
      }
    } catch (error) {
      console.error("La revisión de IA no estuvo disponible:", error.message);
      return response.status(503).json({
        error:
          "No pudimos revisar tus datos ahora. Inténtalo nuevamente en unos minutos.",
      });
    }

    let user;
    try {
      user = await User.create({
        fullName: normalizedName,
        email: normalizedEmail,
        passwordHash: await bcrypt.hash(password, 12),
        country,
        university: normalizedUniversity,
        career: normalizedCareer,
        subjects: normalizedSubjects,
        availability,
        studyPreference,
      });

      await enviarCorreoVerificacion(user);
    } catch (error) {
      if (user) {
        await User.findByIdAndDelete(user._id);
      }
      throw error;
    }

    response.status(201).json({
      message: "Te enviamos un código de verificación a tu Gmail.",
      email: user.email,
      requiresVerification: true,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (request, response, next) => {
  try {
    const email = String(request.body.email || "")
      .trim()
      .toLowerCase();
    const password = String(request.body.password || "");
    const user = await User.findOne({ email }).select(
      "+passwordHash +verificationCodeHash +verificationExpiresAt +verificationLastSentAt +verificationAttempts",
    );

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return response
        .status(401)
        .json({ error: "Correo o contraseña incorrectos." });
    }
    if (user.accountStatus === "banned") {
      return response
        .status(403)
        .json({ error: "Tu cuenta fue suspendida. Contacta a JoinCrew." });
    }
    if (!user.emailVerifiedAt && user.role !== "admin") {
      await enviarCorreoVerificacion(user);
      return response.status(403).json({
        error: "Confirma el código enviado a tu Gmail antes de iniciar sesión.",
        email: user.email,
        requiresVerification: true,
      });
    }

    response.json({
      message: "Inicio de sesión correcto.",
      token: crearToken(user),
      user: usuarioSeguro(user),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/verify-email", async (request, response, next) => {
  try {
    const email = String(request.body.email || "")
      .trim()
      .toLowerCase();
    const code = String(request.body.code || "").trim();
    if (!gmailValido(email) || !/^\d{6}$/.test(code)) {
      return response.status(400).json({
        error: "Ingresa tu Gmail y el código de 6 dígitos.",
      });
    }

    const user = await User.findOne({ email }).select(
      "+verificationCodeHash +verificationExpiresAt +verificationLastSentAt +verificationAttempts",
    );
    if (!user || user.role === "admin") {
      return response
        .status(400)
        .json({ error: "No se pudo verificar esta cuenta." });
    }
    if (user.emailVerifiedAt) {
      return response
        .status(400)
        .json({ error: "Este correo ya fue confirmado." });
    }
    if (!user.verificationCodeHash || !user.verificationExpiresAt) {
      return response.status(400).json({
        error: "Solicita un nuevo código de verificación.",
      });
    }
    if (user.verificationExpiresAt.getTime() < Date.now()) {
      return response.status(400).json({
        error: "El código venció. Solicita uno nuevo.",
      });
    }
    if (user.verificationAttempts >= 5) {
      return response.status(429).json({
        error: "Se superó el límite de intentos. Solicita un código nuevo.",
      });
    }
    if (hashCodigo(code) !== user.verificationCodeHash) {
      user.verificationAttempts += 1;
      await user.save();
      return response.status(400).json({ error: "El código no es correcto." });
    }

    user.emailVerifiedAt = new Date();
    user.verificationCodeHash = null;
    user.verificationExpiresAt = null;
    user.verificationAttempts = 0;
    await user.save();
    response.json({
      message: "Correo confirmado correctamente.",
      token: crearToken(user),
      user: usuarioSeguro(user),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/resend-verification", async (request, response, next) => {
  try {
    const email = String(request.body.email || "")
      .trim()
      .toLowerCase();
    if (!gmailValido(email)) {
      return response
        .status(400)
        .json({ error: "Ingresa un correo de Gmail válido." });
    }
    const user = await User.findOne({ email }).select(
      "+verificationCodeHash +verificationExpiresAt +verificationLastSentAt +verificationAttempts",
    );
    if (!user || user.emailVerifiedAt || user.role === "admin") {
      return response.json({
        message:
          "Si la cuenta requiere verificación, recibirás un código pronto.",
      });
    }
    await enviarCorreoVerificacion(user);
    response.json({ message: "Te enviamos un nuevo código a tu Gmail." });
  } catch (error) {
    next(error);
  }
});

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

module.exports = { router, exigirSesion };
