const form = document.querySelector("#verification-form");
const emailInput = document.querySelector("#verification-email");
const codeInput = document.querySelector("#verification-code");
const verifyButton = document.querySelector("#verify-button");
const resendButton = document.querySelector("#resend-button");
const message = document.querySelector("#verification-message");

emailInput.value =
  sessionStorage.getItem("joincrew_pending_verification") || "";

function showMessage(text, type = "error") {
  message.textContent = text;
  message.dataset.type = type;
}

codeInput.addEventListener("input", () => {
  codeInput.value = codeInput.value.replace(/\D/g, "").slice(0, 6);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  verifyButton.disabled = true;
  verifyButton.textContent = "Verificando…";
  showMessage("");

  try {
    const result = await window.joinCrewApi.post("/auth/verify-email", {
      email: emailInput.value.trim(),
      code: codeInput.value.trim(),
    });
    window.joinCrewApi.saveSession(result);
    sessionStorage.removeItem("joincrew_pending_verification");
    window.location.href = "app.html";
  } catch (error) {
    showMessage(error.message);
  } finally {
    verifyButton.disabled = false;
    verifyButton.textContent = "Confirmar correo";
  }
});

resendButton.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  if (!email) return showMessage("Ingresa tu correo de Gmail.");
  resendButton.disabled = true;
  try {
    const result = await window.joinCrewApi.post("/auth/resend-verification", {
      email,
    });
    showMessage(result.message, "success");
  } catch (error) {
    showMessage(error.message);
  } finally {
    resendButton.disabled = false;
  }
});
