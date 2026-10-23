const contactForm = document.querySelector("#contact-form");
const contactSubmit = document.querySelector("#contact-submit");
const contactFeedback = document.querySelector("#contact-feedback");
const messageInput = document.querySelector("#contact-message");
const messageCount = document.querySelector("#message-count");

function setFeedback(text, state = "") {
  contactFeedback.textContent = text;
  contactFeedback.dataset.state = state;
}

messageInput.addEventListener("input", () => {
  messageCount.textContent = messageInput.value.length;
});

contactForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(contactForm);
  const fullName = data.get("fullName").trim();
  const email = data.get("email").trim();
  const subject = data.get("subject");
  const message = data.get("message").trim();

  contactSubmit.disabled = true;
  contactSubmit.textContent = "Enviando mensaje…";
  setFeedback("");

  try {
    const { message: confirmation } = await window.joinCrewApi.post(
      "/contact",
      {
        fullName,
        email,
        subject,
        message,
      },
    );

    contactForm.reset();
    messageCount.textContent = "0";
    setFeedback(confirmation, "success");
  } catch (error) {
    setFeedback(
      error.message || "No pudimos enviar tu mensaje. Inténtalo nuevamente.",
      "error",
    );
  } finally {
    contactSubmit.disabled = false;
    contactSubmit.textContent = "Enviar mensaje";
  }
});
