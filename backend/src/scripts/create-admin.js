const path = require("path");
const readline = require("node:readline/promises");
const { stdin: input, stdout: output } = require("node:process");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

require("dotenv").config({
  path: path.join(__dirname, "../../../.env"),
});

const { conectarBD } = require("../config/database");
const User = require("../models/User");

function correoValido(email) {
  return /^[^\s@]+@gmail\.com$/i.test(email);
}

function claveValida(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
}

async function crearAdmin() {
  const prompt = readline.createInterface({ input, output });

  try {
    const fullName = (
      await prompt.question("Nombre del administrador: ")
    ).trim();
    const email = (await prompt.question("Correo Gmail: "))
      .trim()
      .toLowerCase();
    const password = await prompt.question("Contraseña: ");

    if (fullName.length < 3) {
      throw new Error("El nombre debe tener al menos 3 caracteres.");
    }
    if (!correoValido(email)) {
      throw new Error("Ingresa un correo de Gmail válido.");
    }
    if (!claveValida(password)) {
      throw new Error(
        "La contraseña debe tener 8 caracteres, mayúscula, minúscula y número.",
      );
    }

    await conectarBD();

    if (await User.exists({ email })) {
      throw new Error("Ya existe una cuenta con ese correo.");
    }

    const now = new Date();
    await User.collection.insertOne({
      fullName,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      emailVerifiedAt: now,
      role: "admin",
      accountStatus: "active",
      createdAt: now,
      updatedAt: now,
    });

    console.log("Cuenta de administración creada correctamente.");
  } finally {
    prompt.close();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  }
}

crearAdmin().catch((error) => {
  console.error(`No se pudo crear la cuenta administrativa: ${error.message}`);
  process.exitCode = 1;
});
