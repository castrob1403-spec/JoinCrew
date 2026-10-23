function errorHandler(error, _request, response, _next) {
  console.error("API error:", error);

  if (error?.code === 11000) {
    return response
      .status(409)
      .json({ error: "Ya existe un registro con esos datos." });
  }
  if (error?.name === "CastError") {
    return response
      .status(400)
      .json({ error: "El identificador recibido no es válido." });
  }

  response.status(500).json({ error: "Ocurrió un error en el servidor." });
}

module.exports = { errorHandler };
