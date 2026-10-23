const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, "../.env"),
});

const app = require("./app");
const { connectDatabase, isDatabaseConnected } = require("./config/database");

const PORT = process.env.PORT || 3000;

app.get("/api/health", (_request, response) => {
  response.json({
    message: "API de JoinCrew funcionando",
    database: isDatabaseConnected() ? "conectada" : "sin conexión",
  });
});

async function startServer() {
  try {
    await connectDatabase();
    console.log("MongoDB conectado correctamente.");
    app.listen(PORT, () =>
      console.log(`API disponible en http://localhost:${PORT}`),
    );
  } catch (error) {
    console.error("No se pudo conectar con MongoDB:", error.message);
  }
}

startServer();
