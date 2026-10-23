const form = document.querySelector("#registration-form");
const button = document.querySelector("#registration-button");
const message = document.querySelector("#registration-message");
const gmailUsername = document.querySelector("#gmail-username");

function showMessage(text, type = "error") {
  message.textContent = text;
  message.dataset.type = type;
}

function validGmailUsername(value) {
  return (
    /^[a-z0-9.]{6,30}$/i.test(value) &&
    !value.startsWith(".") &&
    !value.endsWith(".") &&
    !value.includes("..")
  );
}

gmailUsername.addEventListener("input", () => {
  gmailUsername.value = gmailUsername.value
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "");
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const subjects = String(data.get("subjects") || "")
    .split(",")
    .map((subject) => subject.trim())
    .filter(Boolean);
  const fullName = String(data.get("fullName") || "").trim();
  const username = String(data.get("gmailUsername") || "")
    .trim()
    .toLowerCase();
  const password = String(data.get("password") || "");

  if (fullName.split(/\s+/).length < 2) {
    return showMessage("Escribe tu nombre y al menos un apellido.");
  }
  if (!validGmailUsername(username)) {
    return showMessage(
      "El usuario de Gmail debe tener entre 6 y 30 caracteres; usa letras, números y puntos.",
    );
  }
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) {
    return showMessage(
      "La contraseña debe tener 8 caracteres e incluir mayúscula, minúscula y número.",
    );
  }

  button.disabled = true;
  button.textContent = "Creando cuenta…";
  showMessage("");

  try {
    const result = await window.joinCrewApi.post("/auth/register", {
      fullName,
      email: `${username}@gmail.com`,
      password,
      university: String(data.get("university") || "").trim(),
      country: data.get("country"),
      career: String(data.get("career") || "").trim(),
      subjects,
      availability: data.get("availability"),
      studyPreference: data.get("studyPreference"),
    });
    sessionStorage.setItem("joincrew_pending_verification", result.email);
    showMessage("Te enviamos un código a tu Gmail…", "success");
    window.location.href = "verificar-correo.html";
  } catch (error) {
    showMessage(
      error.message || "No pudimos crear tu cuenta. Inténtalo nuevamente.",
    );
  } finally {
    button.disabled = false;
    button.textContent = "Crear mi cuenta";
  }
});
