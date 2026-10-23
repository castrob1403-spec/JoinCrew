const dns = require("node:dns");
const mongoose = require("mongoose");

let connectionPromise;

dns.setServers(["1.1.1.1", "8.8.8.8"]);

async function connectDatabase() {
  if (!process.env.MONGODB_URI) {
    throw new Error("Falta MONGODB_URI en el archivo .env.");
  }
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGODB_URI, {
      dbName: "JoinCrew",
    });
  }
  try {
    return await connectionPromise;
  } finally {
    connectionPromise = undefined;
  }
}

function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}

module.exports = { connectDatabase, isDatabaseConnected };
