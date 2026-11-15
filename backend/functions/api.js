const serverless = require("serverless-http");
const app = require("../src/app");
const { conectarBD, bdConectada } = require("../src/config/database");

app.get("/api/health", (_request, response) => {
  response.json({
    message: "API de JoinCrew funcionando",
    database: bdConectada() ? "conectada" : "sin conexión",
  });
});

const handler = serverless(app);

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  await conectarBD();
  return handler(event, context);
};
