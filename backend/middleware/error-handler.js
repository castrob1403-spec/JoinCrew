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

  const statusCode = error.statusCode || 500;
  response.status(statusCode).json({
    error:
      statusCode >= 500
        ? "Ocurrió un error en el servidor."
        : error.message || "No se pudo completar la solicitud.",
  });
}

module.exports = { errorHandler };
