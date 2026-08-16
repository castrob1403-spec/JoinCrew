const form = document.querySelector("#registration-form");
const button = document.querySelector("#registration-button");
const message = document.querySelector("#registration-message");

function showMessage(text, type = "error") {
    message.textContent = text;
    message.dataset.type = type;
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const subjects = data.get("subjects")
        .split(",")
        .map((subject) => subject.trim())
        .filter(Boolean);

    button.disabled = true;
    button.textContent = "Creando cuenta...";
    showMessage("");

    try {
        const { error } = await window.studyCircleSupabase.auth.signUp({
            email: data.get("email").trim(),
            password: data.get("password"),
            options: {
                data: {
                    full_name: data.get("fullName").trim(),
                    university: data.get("university").trim(),
                    career: data.get("career").trim(),
                    subjects,
                    availability: data.get("availability"),
                    study_preference: data.get("studyPreference"),
                },
                emailRedirectTo: new URL("app.html", window.location.href).href,
            },
        });

        if (error) throw error;
        showMessage("Revisa tu correo para confirmar tu cuenta. Después podrás iniciar sesión.", "success");
        form.reset();
    } catch (error) {
        showMessage(error.message || "No pudimos crear la cuenta. Inténtalo nuevamente.");
    } finally {
        button.disabled = false;
        button.textContent = "Crear mi cuenta";
    }
});
