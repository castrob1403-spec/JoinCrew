const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { safeUser } = require("../utils/safe-user");

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

function validFullName(value) {
  return (
    /^[\p{L}][\p{L}' -]{1,98}$/u.test(value) && value.split(/\s+/).length >= 2
  );
}

function validGmail(value) {
  const match = value.match(/^([a-z0-9.]{6,30})@gmail\.com$/i);
  if (!match) return false;
  const username = match[1];
  return (
    !username.startsWith(".") &&
    !username.endsWith(".") &&
    !username.includes("..")
  );
}

function validPassword(value) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(value);
}

function createToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );
}

function requireAuth(request, response, next) {
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

    if (!validFullName(normalizedName)) {
      return response
        .status(400)
        .json({ error: "Ingresa tu nombre y al menos un apellido válidos." });
    }
    if (!validGmail(normalizedEmail)) {
      return response
        .status(400)
        .json({ error: "Regístrate con un correo de Gmail válido." });
    }
    if (!validPassword(String(password || ""))) {
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

    const user = await User.create({
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

    response.status(201).json({
      message: "Cuenta creada correctamente.",
      token: createToken(user),
      user: safeUser(user),
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
    const user = await User.findOne({ email }).select("+passwordHash");

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

    response.json({
      message: "Inicio de sesión correcto.",
      token: createToken(user),
      user: safeUser(user),
    });
  } catch (error) {
    next(error);
  }
});

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

module.exports = { router, requireAuth };
