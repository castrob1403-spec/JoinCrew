const form = document.querySelector("#auth-form");
const submitButton = document.querySelector("#submit-button");
const message = document.querySelector("#auth-message");

function showMessage(text, type = "error") {
  message.textContent = text;
  message.dataset.type = type;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  submitButton.disabled = true;
  submitButton.textContent = "Ingresando…";
  showMessage("");

  try {
    const result = await window.joinCrewApi.post("/auth/login", {
      email: form.email.value.trim(),
      password: form.password.value,
    });
    window.joinCrewApi.saveSession(result);
    window.location.href =
      result.user.role === "admin" ? "admin.html" : "app.html";
  } catch (error) {
    showMessage(error.message || "Ocurrió un error. Inténtalo nuevamente.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Iniciar sesión";
  }
});
