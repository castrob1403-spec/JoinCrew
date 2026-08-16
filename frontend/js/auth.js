const form = document.querySelector("#auth-form");
const submitButton = document.querySelector("#submit-button");
const message = document.querySelector("#auth-message");

function showMessage(text, type = "error") {
    message.textContent = text;
    message.dataset.type = type;
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = form.email.value.trim();
    const userPassword = form.password.value;

    submitButton.disabled = true;
    submitButton.textContent = "Ingresando...";
    showMessage("");

    try {
        const { error } = await window.studyCircleSupabase.auth.signInWithPassword({
            email,
            password: userPassword,
        });

        if (error) throw error;
        window.location.href = "app.html";
    } catch (error) {
        showMessage(error.message || "Ocurrió un error. Inténtalo nuevamente.");
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Iniciar sesión";
    }
});
