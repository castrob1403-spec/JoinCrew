const dns = require("node:dns");
const mongoose = require("mongoose");

let connectionPromise;

dns.setServers(["1.1.1.1", "8.8.8.8"]);

async function conectarBD() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("Falta MONGODB_URI en el archivo .env.");
    }

    if (mongoose.connection.readyState === 1) {
      return mongoose.connection;
    }

    if (!connectionPromise) {
      connectionPromise = mongoose.connect(process.env.MONGODB_URI, {
        dbName: "JoinCrew",
      });
    }

    const connection = await connectionPromise;
    console.log("MongoDB conectado correctamente.");
    return connection;
  } catch (error) {
    console.error("Error al conectar con MongoDB:", error.message);
    throw error;
  } finally {
    connectionPromise = undefined;
  }
}

function bdConectada() {
  return mongoose.connection.readyState === 1;
}

module.exports = { conectarBD, bdConectada };
