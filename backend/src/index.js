const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, "../../.env"),
});

const app = require("./app");
const { conectarBD, bdConectada } = require("./config/database");

const PORT = process.env.PORT || 3000;

app.get("/api/health", (_request, response) => {
  response.json({
    message: "API de JoinCrew funcionando",
    database: bdConectada() ? "conectada" : "sin conexión",
  });
});

async function iniciarServidor() {
  try {
    await conectarBD();
    app.listen(PORT, () =>
      console.log(`API disponible en http://localhost:${PORT}`),
    );
  } catch (error) {
    console.error("No se pudo conectar con MongoDB:", error.message);
  }
}

iniciarServidor();
