const serverless = require("serverless-http");
const app = require("../src/app");
const {
  connectDatabase,
  isDatabaseConnected,
} = require("../src/config/database");

app.get("/api/health", (_request, response) => {
  response.json({
    message: "API de JoinCrew funcionando",
    database: isDatabaseConnected() ? "conectada" : "sin conexión",
  });
});

const handler = serverless(app);

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  await connectDatabase();
  return handler(event, context);
};
